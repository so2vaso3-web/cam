#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script để upload code lên nhiều tài khoản GitHub
"""

import subprocess
import sys
import os
import getpass
import json
from typing import List, Dict, Optional
from pathlib import Path

def run_command(cmd: List[str], cwd: str = None) -> tuple:
    """Chạy lệnh shell và trả về output"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True
        )
        return (True, result.stdout.strip())
    except subprocess.CalledProcessError as e:
        return (False, e.stderr.strip())

def check_git_repo() -> bool:
    """Kiểm tra xem có phải git repository không"""
    success, _ = run_command(["git", "rev-parse", "--git-dir"])
    return success

def get_current_branch() -> str:
    """Lấy tên branch hiện tại"""
    success, output = run_command(["git", "branch", "--show-current"])
    return output if success else "main"

def build_url_with_auth(url: str, username: str = None, token: str = None) -> str:
    """Xây dựng URL với authentication"""
    if not username and not token:
        return url
    
    # Nếu có token, dùng token (ưu tiên)
    if token:
        # Token thay thế password trong GitHub
        if "https://" in url:
            url = url.replace("https://", f"https://{token}@")
        elif "http://" in url:
            url = url.replace("http://", f"http://{token}@")
    elif username:
        # Nếu chỉ có username, sẽ hỏi password khi push
        if "https://" in url:
            url = url.replace("https://", f"https://{username}@")
        elif "http://" in url:
            url = url.replace("http://", f"http://{username}@")
    
    return url

def add_remote(name: str, url: str, username: str = None, token: str = None) -> bool:
    """Thêm remote mới với authentication"""
    # Xây dựng URL với auth nếu có
    if username or token:
        url = build_url_with_auth(url, username, token)
    
    # Kiểm tra remote đã tồn tại chưa
    success, output = run_command(["git", "remote", "get-url", name])
    if success:
        print(f"⚠️  Remote '{name}' đã tồn tại với URL: {output}")
        choice = input(f"Bạn có muốn cập nhật URL? (y/n): ").lower()
        if choice == 'y':
            success, _ = run_command(["git", "remote", "set-url", name, url])
            if success:
                print(f"✅ Đã cập nhật remote '{name}'")
                return True
        return False
    
    # Thêm remote mới
    success, error = run_command(["git", "remote", "add", name, url])
    if success:
        # Ẩn token trong output
        display_url = url
        if "@" in display_url:
            parts = display_url.split("@")
            if len(parts) > 1:
                display_url = f"{parts[0].split('//')[0]}//***@{parts[1]}"
        print(f"✅ Đã thêm remote '{name}': {display_url}")
        return True
    else:
        print(f"❌ Lỗi khi thêm remote '{name}': {error}")
        return False

def list_remotes() -> Dict[str, str]:
    """Liệt kê tất cả remotes"""
    success, output = run_command(["git", "remote", "-v"])
    remotes = {}
    if success:
        for line in output.split('\n'):
            if line.strip():
                parts = line.split()
                if len(parts) >= 2:
                    remotes[parts[0]] = parts[1]
    return remotes

def get_changed_files() -> List[str]:
    """Lấy danh sách file đã thay đổi"""
    success, output = run_command(["git", "status", "--porcelain"])
    files = []
    if success:
        for line in output.split('\n'):
            if line.strip():
                # Format: " M file.txt" hoặc "?? newfile.txt"
                file_path = line.strip().split(maxsplit=1)[-1]
                files.append(file_path)
    return files

def select_files_to_commit() -> List[str]:
    """Chọn file để commit"""
    files = get_changed_files()
    
    if not files:
        print("❌ Không có file nào thay đổi!")
        return []
    
    print("\n📋 Danh sách file thay đổi:")
    for i, file in enumerate(files, 1):
        print(f"  {i}. {file}")
    
    print("\nChọn file để commit:")
    print("  - Nhập số (ví dụ: 1,2,3 hoặc 1-3)")
    print("  - Nhập 'all' để chọn tất cả")
    print("  - Nhập 'path' để nhập đường dẫn file/folder")
    print("  - Nhập 'skip' để bỏ qua")
    
    choice = input("Lựa chọn: ").strip().lower()
    
    selected = []
    
    if choice == 'all':
        selected = files
    elif choice == 'skip':
        return []
    elif choice == 'path':
        path_input = input("Nhập đường dẫn file/folder (có thể nhiều, cách nhau bởi dấu phẩy): ").strip()
        paths = [p.strip() for p in path_input.split(',')]
        for path in paths:
            if os.path.exists(path):
                selected.append(path)
            else:
                print(f"⚠️  Không tìm thấy: {path}")
    else:
        # Parse số
        try:
            for part in choice.split(','):
                part = part.strip()
                if '-' in part:
                    # Range: 1-3
                    start, end = map(int, part.split('-'))
                    selected.extend(files[start-1:end])
                else:
                    # Single number
                    idx = int(part) - 1
                    if 0 <= idx < len(files):
                        selected.append(files[idx])
        except ValueError:
            print("❌ Định dạng không hợp lệ!")
            return []
    
    return list(set(selected))  # Remove duplicates

def commit_files(files: List[str], message: str) -> bool:
    """Commit các file đã chọn"""
    if not files:
        print("❌ Không có file nào để commit!")
        return False
    
    print(f"\n📝 Đang add {len(files)} file(s)...")
    for file in files:
        success, error = run_command(["git", "add", file])
        if not success:
            print(f"⚠️  Lỗi khi add {file}: {error}")
    
    print(f"💾 Đang commit với message: '{message}'...")
    success, error = run_command(["git", "commit", "-m", message])
    
    if success:
        print(f"✅ Đã commit thành công {len(files)} file(s)!")
        return True
    else:
        print(f"❌ Lỗi khi commit: {error}")
        return False

def push_to_remote(remote_name: str, branch: str = None, username: str = None, password: str = None) -> bool:
    """Push code lên remote"""
    if branch is None:
        branch = get_current_branch()
    
    print(f"\n📤 Đang push lên {remote_name}...")
    
    # Nếu có username/password, sử dụng credential helper
    env = os.environ.copy()
    if username and password:
        # Sử dụng GIT_ASKPASS hoặc credential helper
        cmd = ["git", "push", remote_name, branch]
        # Tạo process với input
        try:
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            # Git sẽ tự động hỏi credentials nếu cần
            stdout, stderr = process.communicate()
            if process.returncode == 0:
                print(f"✅ Đã push thành công lên {remote_name}/{branch}")
                return True
            else:
                print(f"❌ Lỗi khi push lên {remote_name}: {stderr}")
                return False
        except Exception as e:
            print(f"❌ Lỗi: {e}")
            return False
    else:
        success, output = run_command(["git", "push", remote_name, branch])
        
        if success:
            print(f"✅ Đã push thành công lên {remote_name}/{branch}")
            return True
        else:
            print(f"❌ Lỗi khi push lên {remote_name}: {output}")
            if "Authentication" in output or "credentials" in output.lower():
                print("💡 Tip: Hãy thêm username/token khi thêm remote hoặc cấu hình SSH key")
            return False

def push_to_all_remotes(branch: str = None) -> Dict[str, bool]:
    """Push code lên tất cả remotes"""
    remotes = list_remotes()
    results = {}
    
    if not remotes:
        print("❌ Không có remote nào được cấu hình!")
        return results
    
    print(f"\n📋 Tìm thấy {len(remotes)} remote(s):")
    for name, url in remotes.items():
        print(f"  - {name}: {url}")
    
    if branch is None:
        branch = get_current_branch()
    
    print(f"\n🚀 Bắt đầu push branch '{branch}' lên tất cả remotes...\n")
    
    for remote_name in remotes.keys():
        results[remote_name] = push_to_remote(remote_name, branch)
    
    return results

def main():
    """Hàm chính"""
    print("=" * 60)
    print("🚀 MULTI GITHUB UPLOAD SCRIPT")
    print("=" * 60)
    
    # Kiểm tra git repo
    if not check_git_repo():
        print("❌ Đây không phải là git repository!")
        print("💡 Hãy chạy 'git init' trước")
        sys.exit(1)
    
    # Kiểm tra có thay đổi chưa commit không - sẽ hỏi sau trong menu
    
    while True:
        print("\n" + "=" * 60)
        print("📋 MENU:")
        print("1. Xem danh sách remotes")
        print("2. Thêm remote mới (có nhập tài khoản)")
        print("3. Chọn file và commit")
        print("4. Push lên một remote cụ thể")
        print("5. Push lên TẤT CẢ remotes")
        print("6. Thoát")
        print("=" * 60)
        
        choice = input("\nChọn chức năng (1-6): ").strip()
        
        if choice == '1':
            remotes = list_remotes()
            if remotes:
                print("\n📋 Danh sách remotes:")
                for name, url in remotes.items():
                    print(f"  - {name}: {url}")
            else:
                print("❌ Chưa có remote nào!")
        
        elif choice == '2':
            name = input("Nhập tên remote (ví dụ: github2, backup): ").strip()
            url = input("Nhập URL GitHub (ví dụ: https://github.com/user/repo.git): ").strip()
            
            if not name or not url:
                print("❌ Tên và URL không được để trống!")
                continue
            
            print("\n🔐 Cấu hình Authentication:")
            print("1. Sử dụng Personal Access Token (khuyến nghị)")
            print("2. Sử dụng Username/Password")
            print("3. Không dùng (sẽ hỏi khi push)")
            
            auth_choice = input("Chọn (1-3, Enter = 3): ").strip() or "3"
            
            username = None
            token = None
            
            if auth_choice == '1':
                token = getpass.getpass("Nhập Personal Access Token: ").strip()
                if not token:
                    print("⚠️  Token trống, sẽ không dùng authentication")
            elif auth_choice == '2':
                username = input("Nhập Username: ").strip()
                password = getpass.getpass("Nhập Password: ").strip()
                if username and password:
                    # Lưu password vào URL
                    token = password  # Dùng password như token
                else:
                    print("⚠️  Username/Password trống, sẽ không dùng authentication")
            
            add_remote(name, url, username, token)
        
        elif choice == '3':
            # Chọn file và commit
            files = select_files_to_commit()
            if files:
                commit_msg = input("\nNhập commit message (Enter để dùng mặc định): ").strip()
                if not commit_msg:
                    commit_msg = "Update code"
                commit_files(files, commit_msg)
            else:
                print("❌ Không có file nào được chọn!")
        
        elif choice == '4':
            remotes = list_remotes()
            if not remotes:
                print("❌ Chưa có remote nào!")
                continue
            
            print("\n📋 Chọn remote:")
            remote_list = list(remotes.keys())
            for i, name in enumerate(remote_list, 1):
                print(f"  {i}. {name} ({remotes[name]})")
            
            try:
                idx = int(input("Chọn số (1-{}): ".format(len(remote_list)))) - 1
                if 0 <= idx < len(remote_list):
                    remote_name = remote_list[idx]
                    branch = input(f"Nhập branch (Enter để dùng '{get_current_branch()}'): ").strip()
                    if not branch:
                        branch = get_current_branch()
                    push_to_remote(remote_name, branch)
                else:
                    print("❌ Số không hợp lệ!")
            except ValueError:
                print("❌ Vui lòng nhập số!")
        
        elif choice == '5':
            branch = input(f"Nhập branch (Enter để dùng '{get_current_branch()}'): ").strip()
            if not branch:
                branch = get_current_branch()
            
            confirm = input(f"⚠️  Bạn chắc chắn muốn push lên TẤT CẢ remotes? (yes/no): ").lower()
            if confirm == 'yes':
                results = push_to_all_remotes(branch)
                
                print("\n" + "=" * 60)
                print("📊 KẾT QUẢ:")
                success_count = sum(1 for v in results.values() if v)
                total = len(results)
                print(f"✅ Thành công: {success_count}/{total}")
                print(f"❌ Thất bại: {total - success_count}/{total}")
                print("=" * 60)
            else:
                print("❌ Đã hủy!")
        
        elif choice == '5':
            print("👋 Tạm biệt!")
            break
        
        else:
            print("❌ Lựa chọn không hợp lệ!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Đã dừng bởi người dùng!")
        sys.exit(0)

