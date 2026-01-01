#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script GUI để upload code lên nhiều tài khoản GitHub
"""

import subprocess
import sys
import os
import getpass
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext, filedialog
from typing import List, Dict, Optional
from pathlib import Path

class GitHubUploadGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🚀 Multi GitHub Upload")
        self.root.geometry("900x700")
        self.root.resizable(True, True)
        
        # Kiểm tra git repo
        if not self.check_git_repo():
            messagebox.showerror("Lỗi", "Đây không phải là git repository!\nHãy chạy 'git init' trước")
            sys.exit(1)
        
        self.setup_ui()
        
        # Kiểm tra và cấu hình git user (sau khi setup UI để có root window)
        self.check_and_setup_git_user()
        
        self.refresh_remotes()
        self.refresh_files()
    
    def run_command(self, cmd: List[str], cwd: str = None) -> tuple:
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
    
    def check_git_repo(self) -> bool:
        """Kiểm tra xem có phải git repository không"""
        success, _ = self.run_command(["git", "rev-parse", "--git-dir"])
        return success
    
    def get_current_branch(self) -> str:
        """Lấy tên branch hiện tại"""
        success, output = self.run_command(["git", "branch", "--show-current"])
        return output if success else "main"
    
    def get_git_config(self, key: str, global_config: bool = True) -> Optional[str]:
        """Lấy giá trị git config"""
        scope = "--global" if global_config else "--local"
        success, output = self.run_command(["git", "config", scope, key])
        return output if success else None
    
    def set_git_config(self, key: str, value: str, global_config: bool = True) -> bool:
        """Đặt giá trị git config"""
        scope = "--global" if global_config else "--local"
        success, _ = self.run_command(["git", "config", scope, key, value])
        return success
    
    def check_and_setup_git_user(self):
        """Kiểm tra và cấu hình git user nếu chưa có"""
        user_name = self.get_git_config("user.name")
        user_email = self.get_git_config("user.email")
        
        if not user_name or not user_email:
            # Hiển thị dialog để nhập thông tin
            dialog = tk.Toplevel(self.root)
            dialog.title("🔧 Cấu hình Git User")
            dialog.geometry("500x250")
            dialog.transient(self.root)
            dialog.grab_set()
            
            # Center dialog
            dialog.update_idletasks()
            x = (dialog.winfo_screenwidth() // 2) - (550 // 2)
            y = (dialog.winfo_screenheight() // 2) - (320 // 2)
            dialog.geometry(f"550x320+{x}+{y}")
            
            ttk.Label(dialog, text="Git cần biết thông tin của bạn để commit", 
                     font=("Arial", 10, "bold")).pack(pady=10)
            
            # Frame hướng dẫn
            info_frame = ttk.Frame(dialog, padding=10)
            info_frame.pack(fill=tk.X, padx=10)
            ttk.Label(info_frame, text="💡 Hướng dẫn:", font=("Arial", 9, "bold")).pack(anchor=tk.W)
            ttk.Label(info_frame, text="• Tên: Tên của bạn hoặc username GitHub (ví dụ: Nguyen Van A hoặc nguyenvana)", 
                     font=("Arial", 8), foreground="gray").pack(anchor=tk.W)
            ttk.Label(info_frame, text="• Email: Email GitHub của bạn (ví dụ: nguyenvana@gmail.com)", 
                     font=("Arial", 8), foreground="gray").pack(anchor=tk.W)
            
            frame = ttk.Frame(dialog, padding=20)
            frame.pack(fill=tk.BOTH, expand=True)
            
            ttk.Label(frame, text="Tên:", font=("Arial", 9)).grid(row=0, column=0, sticky=tk.W, pady=5)
            name_entry = ttk.Entry(frame, width=40)
            name_entry.grid(row=0, column=1, padx=5, pady=5)
            if user_name:
                name_entry.insert(0, user_name)
            else:
                name_entry.insert(0, "Your Name")
            
            ttk.Label(frame, text="Email:", font=("Arial", 9)).grid(row=1, column=0, sticky=tk.W, pady=5)
            email_entry = ttk.Entry(frame, width=40)
            email_entry.grid(row=1, column=1, padx=5, pady=5)
            if user_email:
                email_entry.insert(0, user_email)
            else:
                email_entry.insert(0, "your.email@example.com")
            
            use_global = tk.BooleanVar(value=True)
            ttk.Checkbutton(frame, text="Áp dụng cho tất cả repositories (--global)", 
                           variable=use_global).grid(row=2, column=0, columnspan=2, pady=10)
            
            def save_config():
                name = name_entry.get().strip()
                email = email_entry.get().strip()
                
                # Kiểm tra giá trị mặc định
                if name == "Your Name" or not name:
                    messagebox.showerror("Lỗi", "Vui lòng nhập tên của bạn!\n\nVí dụ: Nguyen Van A hoặc nguyenvana", parent=dialog)
                    name_entry.focus()
                    return
                
                if email == "your.email@example.com" or not email:
                    messagebox.showerror("Lỗi", "Vui lòng nhập email của bạn!\n\nVí dụ: nguyenvana@gmail.com", parent=dialog)
                    email_entry.focus()
                    return
                
                # Validate email format (basic)
                if "@" not in email or "." not in email.split("@")[1]:
                    messagebox.showerror("Lỗi", "Email không hợp lệ!\n\nVí dụ: nguyenvana@gmail.com", parent=dialog)
                    email_entry.focus()
                    return
                
                global_config = use_global.get()
                if self.set_git_config("user.name", name, global_config) and \
                   self.set_git_config("user.email", email, global_config):
                    messagebox.showinfo("Thành công", 
                                      f"Đã cấu hình Git user:\nTên: {name}\nEmail: {email}", 
                                      parent=dialog)
                    dialog.destroy()
                else:
                    messagebox.showerror("Lỗi", "Không thể cấu hình Git user!", parent=dialog)
            
            ttk.Button(frame, text="💾 Lưu", command=save_config).grid(row=3, column=0, columnspan=2, pady=10)
            
            # Select all text khi focus
            def on_name_focus(event):
                if name_entry.get() == "Your Name":
                    name_entry.select_range(0, tk.END)
            
            def on_email_focus(event):
                if email_entry.get() == "your.email@example.com":
                    email_entry.select_range(0, tk.END)
            
            name_entry.bind("<FocusIn>", on_name_focus)
            email_entry.bind("<FocusIn>", on_email_focus)
            
            # Focus vào name entry
            name_entry.focus()
            name_entry.select_range(0, tk.END)
            
            # Bind Enter key
            name_entry.bind("<Return>", lambda e: email_entry.focus())
            email_entry.bind("<Return>", lambda e: save_config())
            
            # Đợi dialog đóng
            dialog.wait_window()
    
    def setup_ui(self):
        """Thiết lập giao diện"""
        # Notebook để tạo tabs
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Tab 1: Quản lý Remotes
        tab_remotes = ttk.Frame(notebook)
        notebook.add(tab_remotes, text="📋 Remotes")
        self.setup_remotes_tab(tab_remotes)
        
        # Tab 2: Chọn File & Commit
        tab_files = ttk.Frame(notebook)
        notebook.add(tab_files, text="📁 Files & Commit")
        self.setup_files_tab(tab_files)
        
        # Tab 3: Push Code
        tab_push = ttk.Frame(notebook)
        notebook.add(tab_push, text="📤 Push")
        self.setup_push_tab(tab_push)
        
        # Tab 4: Log
        tab_log = ttk.Frame(notebook)
        notebook.add(tab_log, text="📝 Log")
        self.setup_log_tab(tab_log)
    
    def setup_remotes_tab(self, parent):
        """Tab quản lý remotes"""
        # Frame thêm remote mới
        frame_add = ttk.LabelFrame(parent, text="➕ Thêm Remote Mới", padding=10)
        frame_add.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(frame_add, text="Tên remote:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.remote_name_entry = ttk.Entry(frame_add, width=30)
        self.remote_name_entry.grid(row=0, column=1, padx=5, pady=5)
        
        ttk.Label(frame_add, text="URL GitHub:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.remote_url_entry = ttk.Entry(frame_add, width=50)
        self.remote_url_entry.grid(row=1, column=1, padx=5, pady=5)
        
        # Authentication
        auth_frame = ttk.LabelFrame(frame_add, text="🔐 Authentication", padding=5)
        auth_frame.grid(row=2, column=0, columnspan=2, sticky=tk.W+tk.E, pady=10)
        
        self.auth_type = tk.StringVar(value="none")
        ttk.Radiobutton(auth_frame, text="Không dùng", variable=self.auth_type, value="none").pack(side=tk.LEFT, padx=10)
        ttk.Radiobutton(auth_frame, text="Token", variable=self.auth_type, value="token").pack(side=tk.LEFT, padx=10)
        ttk.Radiobutton(auth_frame, text="Username/Password", variable=self.auth_type, value="userpass").pack(side=tk.LEFT, padx=10)
        
        # Token/Password entry
        self.auth_frame_input = ttk.Frame(auth_frame)
        self.auth_frame_input.pack(fill=tk.X, pady=5)
        
        ttk.Label(self.auth_frame_input, text="Token:").pack(side=tk.LEFT, padx=5)
        self.token_entry = ttk.Entry(self.auth_frame_input, width=40, show="*")
        self.token_entry.pack(side=tk.LEFT, padx=5)
        
        self.username_entry = None
        self.password_entry = None
        
        # Update auth input khi chọn
        self.auth_type.trace('w', self.update_auth_input)
        
        ttk.Button(frame_add, text="➕ Thêm Remote", command=self.add_remote).grid(row=3, column=0, columnspan=2, pady=10)
        
        # Danh sách remotes
        frame_list = ttk.LabelFrame(parent, text="📋 Danh sách Remotes", padding=10)
        frame_list.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Treeview để hiển thị remotes
        columns = ("name", "url")
        self.remotes_tree = ttk.Treeview(frame_list, columns=columns, show="headings", height=10)
        self.remotes_tree.heading("name", text="Tên Remote")
        self.remotes_tree.heading("url", text="URL")
        self.remotes_tree.column("name", width=150)
        self.remotes_tree.column("url", width=500)
        
        scrollbar_remotes = ttk.Scrollbar(frame_list, orient=tk.VERTICAL, command=self.remotes_tree.yview)
        self.remotes_tree.configure(yscrollcommand=scrollbar_remotes.set)
        
        self.remotes_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar_remotes.pack(side=tk.RIGHT, fill=tk.Y)
        
        ttk.Button(frame_list, text="🔄 Làm mới", command=self.refresh_remotes).pack(pady=5)
        ttk.Button(frame_list, text="🗑️ Xóa Remote", command=self.remove_remote).pack(pady=5)
    
    def update_auth_input(self, *args):
        """Cập nhật input authentication"""
        for widget in self.auth_frame_input.winfo_children():
            widget.destroy()
        
        auth_type = self.auth_type.get()
        if auth_type == "token":
            ttk.Label(self.auth_frame_input, text="Token:").pack(side=tk.LEFT, padx=5)
            self.token_entry = ttk.Entry(self.auth_frame_input, width=40, show="*")
            self.token_entry.pack(side=tk.LEFT, padx=5)
        elif auth_type == "userpass":
            ttk.Label(self.auth_frame_input, text="Username:").pack(side=tk.LEFT, padx=5)
            self.username_entry = ttk.Entry(self.auth_frame_input, width=15)
            self.username_entry.pack(side=tk.LEFT, padx=5)
            ttk.Label(self.auth_frame_input, text="Password:").pack(side=tk.LEFT, padx=5)
            self.password_entry = ttk.Entry(self.auth_frame_input, width=20, show="*")
            self.password_entry.pack(side=tk.LEFT, padx=5)
    
    def setup_files_tab(self, parent):
        """Tab chọn file và commit"""
        # Frame chọn file
        frame_select = ttk.LabelFrame(parent, text="📁 Chọn File", padding=10)
        frame_select.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Treeview để hiển thị files
        columns = ("status", "file")
        self.files_tree = ttk.Treeview(frame_select, columns=columns, show="tree headings", height=15)
        self.files_tree.heading("#0", text="")
        self.files_tree.heading("status", text="Trạng thái")
        self.files_tree.heading("file", text="File")
        self.files_tree.column("#0", width=30)
        self.files_tree.column("status", width=100)
        self.files_tree.column("file", width=600)
        
        # Checkbox column
        self.files_tree.tag_configure("selected", background="lightgreen")
        
        scrollbar_files = ttk.Scrollbar(frame_select, orient=tk.VERTICAL, command=self.files_tree.yview)
        self.files_tree.configure(yscrollcommand=scrollbar_files.set)
        
        self.files_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar_files.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Bind click để chọn/bỏ chọn
        self.files_tree.bind("<Button-1>", self.toggle_file_selection)
        
        # Buttons
        frame_buttons = ttk.Frame(frame_select)
        frame_buttons.pack(fill=tk.X, pady=5)
        
        ttk.Button(frame_buttons, text="🔄 Làm mới", command=self.refresh_files).pack(side=tk.LEFT, padx=5)
        ttk.Button(frame_buttons, text="✅ Chọn tất cả", command=self.select_all_files).pack(side=tk.LEFT, padx=5)
        ttk.Button(frame_buttons, text="❌ Bỏ chọn tất cả", command=self.deselect_all_files).pack(side=tk.LEFT, padx=5)
        
        # Frame commit
        frame_commit = ttk.LabelFrame(parent, text="💾 Commit", padding=10)
        frame_commit.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(frame_commit, text="Commit message:").pack(anchor=tk.W)
        self.commit_msg_entry = ttk.Entry(frame_commit, width=80)
        self.commit_msg_entry.pack(fill=tk.X, pady=5)
        self.commit_msg_entry.insert(0, "Update code")
        
        ttk.Button(frame_commit, text="💾 Commit Files Đã Chọn", command=self.commit_selected_files).pack(pady=10)
    
    def setup_push_tab(self, parent):
        """Tab push code"""
        # Frame chọn remote và branch
        frame_push = ttk.LabelFrame(parent, text="📤 Push Code", padding=10)
        frame_push.pack(fill=tk.X, padx=10, pady=5)
        
        ttk.Label(frame_push, text="Chọn Remote:").grid(row=0, column=0, sticky=tk.W, pady=5)
        self.push_remote_var = tk.StringVar()
        self.push_remote_combo = ttk.Combobox(frame_push, textvariable=self.push_remote_var, width=40, state="readonly")
        self.push_remote_combo.grid(row=0, column=1, padx=5, pady=5)
        
        ttk.Label(frame_push, text="Branch:").grid(row=1, column=0, sticky=tk.W, pady=5)
        self.push_branch_entry = ttk.Entry(frame_push, width=40)
        self.push_branch_entry.grid(row=1, column=1, padx=5, pady=5)
        self.push_branch_entry.insert(0, self.get_current_branch())
        
        # Buttons
        frame_buttons = ttk.Frame(frame_push)
        frame_buttons.grid(row=2, column=0, columnspan=2, pady=10)
        
        ttk.Button(frame_buttons, text="📤 Push lên Remote đã chọn", command=self.push_to_selected_remote).pack(side=tk.LEFT, padx=5)
        ttk.Button(frame_buttons, text="🚀 Push lên TẤT CẢ Remotes", command=self.push_to_all_remotes).pack(side=tk.LEFT, padx=5)
        
        # Progress bar
        self.progress_var = tk.StringVar(value="Sẵn sàng")
        ttk.Label(parent, textvariable=self.progress_var).pack(pady=5)
        self.progress_bar = ttk.Progressbar(parent, mode='indeterminate')
        self.progress_bar.pack(fill=tk.X, padx=10, pady=5)
    
    def setup_log_tab(self, parent):
        """Tab log"""
        frame_log = ttk.LabelFrame(parent, text="📝 Log", padding=10)
        frame_log.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        self.log_text = scrolledtext.ScrolledText(frame_log, height=25, width=80)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        ttk.Button(frame_log, text="🗑️ Xóa Log", command=self.clear_log).pack(pady=5)
    
    def log(self, message: str):
        """Thêm message vào log"""
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.root.update()
    
    def clear_log(self):
        """Xóa log"""
        self.log_text.delete(1.0, tk.END)
    
    def refresh_remotes(self):
        """Làm mới danh sách remotes"""
        for item in self.remotes_tree.get_children():
            self.remotes_tree.delete(item)
        
        remotes = self.list_remotes()
        for name, url in remotes.items():
            # Ẩn token trong URL nếu có
            display_url = url
            if "@" in display_url and "://" in display_url:
                parts = display_url.split("@")
                if len(parts) > 1:
                    display_url = f"{parts[0].split('//')[0]}//***@{parts[1]}"
            
            self.remotes_tree.insert("", tk.END, values=(name, display_url))
        
        # Cập nhật combobox
        self.push_remote_combo['values'] = list(remotes.keys())
        if remotes:
            self.push_remote_var.set(list(remotes.keys())[0])
    
    def list_remotes(self) -> Dict[str, str]:
        """Liệt kê tất cả remotes"""
        success, output = self.run_command(["git", "remote", "-v"])
        remotes = {}
        if success:
            for line in output.split('\n'):
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 2:
                        remotes[parts[0]] = parts[1]
        return remotes
    
    def add_remote(self):
        """Thêm remote mới"""
        name = self.remote_name_entry.get().strip()
        url = self.remote_url_entry.get().strip()
        
        if not name or not url:
            messagebox.showerror("Lỗi", "Tên và URL không được để trống!")
            return
        
        # Xử lý authentication
        auth_type = self.auth_type.get()
        token = None
        username = None
        
        if auth_type == "token":
            token = self.token_entry.get().strip() if hasattr(self, 'token_entry') and self.token_entry else None
            if token:
                if "https://" in url:
                    url = url.replace("https://", f"https://{token}@")
                elif "http://" in url:
                    url = url.replace("http://", f"http://{token}@")
        elif auth_type == "userpass":
            username = self.username_entry.get().strip() if hasattr(self, 'username_entry') and self.username_entry else None
            password = self.password_entry.get().strip() if hasattr(self, 'password_entry') and self.password_entry else None
            if username and password:
                if "https://" in url:
                    url = url.replace("https://", f"https://{username}:{password}@")
                elif "http://" in url:
                    url = url.replace("http://", f"http://{username}:{password}@")
        
        # Kiểm tra remote đã tồn tại
        remotes = self.list_remotes()
        if name in remotes:
            if not messagebox.askyesno("Xác nhận", f"Remote '{name}' đã tồn tại. Bạn có muốn cập nhật?"):
                return
            success, _ = self.run_command(["git", "remote", "set-url", name, url])
        else:
            success, error = self.run_command(["git", "remote", "add", name, url])
        
        if success:
            messagebox.showinfo("Thành công", f"Đã thêm/cập nhật remote '{name}'!")
            self.remote_name_entry.delete(0, tk.END)
            self.remote_url_entry.delete(0, tk.END)
            if hasattr(self, 'token_entry') and self.token_entry:
                self.token_entry.delete(0, tk.END)
            self.refresh_remotes()
            self.log(f"✅ Đã thêm remote: {name}")
        else:
            messagebox.showerror("Lỗi", f"Không thể thêm remote: {error}")
            self.log(f"❌ Lỗi thêm remote: {error}")
    
    def remove_remote(self):
        """Xóa remote"""
        selection = self.remotes_tree.selection()
        if not selection:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn remote để xóa!")
            return
        
        item = self.remotes_tree.item(selection[0])
        remote_name = item['values'][0]
        
        if messagebox.askyesno("Xác nhận", f"Bạn chắc chắn muốn xóa remote '{remote_name}'?"):
            success, error = self.run_command(["git", "remote", "remove", remote_name])
            if success:
                messagebox.showinfo("Thành công", f"Đã xóa remote '{remote_name}'!")
                self.refresh_remotes()
                self.log(f"✅ Đã xóa remote: {remote_name}")
            else:
                messagebox.showerror("Lỗi", f"Không thể xóa remote: {error}")
    
    def refresh_files(self):
        """Làm mới danh sách files"""
        for item in self.files_tree.get_children():
            self.files_tree.delete(item)
        
        success, output = self.run_command(["git", "status", "--porcelain"])
        if success:
            for line in output.split('\n'):
                if line.strip():
                    parts = line.strip().split(maxsplit=1)
                    if len(parts) >= 2:
                        status = parts[0]
                        file_path = parts[1]
                        
                        status_text = {
                            'M': 'Modified',
                            'A': 'Added',
                            'D': 'Deleted',
                            '??': 'Untracked',
                            'R': 'Renamed'
                        }.get(status, status)
                        
                        item = self.files_tree.insert("", tk.END, values=(status_text, file_path), tags=())
    
    def toggle_file_selection(self, event):
        """Toggle selection của file"""
        item = self.files_tree.selection()[0] if self.files_tree.selection() else None
        if item:
            current_tags = self.files_tree.item(item, "tags")
            if "selected" in current_tags:
                self.files_tree.item(item, tags=())
            else:
                self.files_tree.item(item, tags=("selected",))
    
    def select_all_files(self):
        """Chọn tất cả files"""
        for item in self.files_tree.get_children():
            self.files_tree.item(item, tags=("selected",))
    
    def deselect_all_files(self):
        """Bỏ chọn tất cả files"""
        for item in self.files_tree.get_children():
            self.files_tree.item(item, tags=())
    
    def get_selected_files(self) -> List[str]:
        """Lấy danh sách file đã chọn"""
        selected = []
        for item in self.files_tree.get_children():
            tags = self.files_tree.item(item, "tags")
            if "selected" in tags:
                file_path = self.files_tree.item(item, "values")[1]
                selected.append(file_path)
        return selected
    
    def commit_selected_files(self):
        """Commit các file đã chọn"""
        files = self.get_selected_files()
        if not files:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn ít nhất một file!")
            return
        
        commit_msg = self.commit_msg_entry.get().strip()
        if not commit_msg:
            commit_msg = "Update code"
        
        self.log(f"📝 Đang commit {len(files)} file(s)...")
        self.progress_bar.start()
        self.progress_var.set("Đang commit...")
        
        # Add files
        for file in files:
            success, error = self.run_command(["git", "add", file])
            if not success:
                self.log(f"⚠️  Lỗi khi add {file}: {error}")
        
        # Commit
        success, error = self.run_command(["git", "commit", "-m", commit_msg])
        self.progress_bar.stop()
        
        if success:
            messagebox.showinfo("Thành công", f"Đã commit thành công {len(files)} file(s)!")
            self.log(f"✅ Đã commit thành công với message: '{commit_msg}'")
            self.refresh_files()
            self.progress_var.set("✅ Commit thành công!")
        else:
            messagebox.showerror("Lỗi", f"Không thể commit: {error}")
            self.log(f"❌ Lỗi commit: {error}")
            self.progress_var.set("❌ Commit thất bại")
    
    def push_to_selected_remote(self):
        """Push lên remote đã chọn"""
        remote_name = self.push_remote_var.get()
        if not remote_name:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn remote!")
            return
        
        branch = self.push_branch_entry.get().strip()
        if not branch:
            branch = self.get_current_branch()
        
        self.push_to_remote(remote_name, branch)
    
    def push_to_all_remotes(self):
        """Push lên tất cả remotes"""
        remotes = self.list_remotes()
        if not remotes:
            messagebox.showwarning("Cảnh báo", "Không có remote nào!")
            return
        
        if not messagebox.askyesno("Xác nhận", f"Bạn chắc chắn muốn push lên TẤT CẢ {len(remotes)} remote(s)?"):
            return
        
        branch = self.push_branch_entry.get().strip()
        if not branch:
            branch = self.get_current_branch()
        
        results = {}
        for remote_name in remotes.keys():
            results[remote_name] = self.push_to_remote(remote_name, branch)
        
        success_count = sum(1 for v in results.values() if v)
        total = len(results)
        messagebox.showinfo("Kết quả", f"✅ Thành công: {success_count}/{total}\n❌ Thất bại: {total - success_count}/{total}")
    
    def push_to_remote(self, remote_name: str, branch: str) -> bool:
        """Push code lên remote"""
        self.log(f"\n📤 Đang push lên {remote_name}/{branch}...")
        self.progress_bar.start()
        self.progress_var.set(f"Đang push lên {remote_name}...")
        
        success, output = self.run_command(["git", "push", remote_name, branch])
        self.progress_bar.stop()
        
        if success:
            self.log(f"✅ Đã push thành công lên {remote_name}/{branch}")
            self.progress_var.set(f"✅ Push thành công: {remote_name}")
            return True
        else:
            self.log(f"❌ Lỗi khi push lên {remote_name}: {output}")
            self.progress_var.set(f"❌ Push thất bại: {remote_name}")
            if "Authentication" in output or "credentials" in output.lower():
                self.log("💡 Tip: Hãy thêm username/token khi thêm remote")
            return False

def main():
    root = tk.Tk()
    app = GitHubUploadGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()

