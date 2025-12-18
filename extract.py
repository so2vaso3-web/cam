import zipfile
import os
import sys

apk_path = r"c:\Users\Administrator\Downloads\ThÆ° mù£c mÆ¡̀i (2)\base.apk"
extract_path = r"c:\Users\Administrator\Downloads\ThÆ° mù£c mÆ¡̀i (2)\extracted_apk"

if os.path.exists(extract_path):
    import shutil
    shutil.rmtree(extract_path)
os.makedirs(extract_path, exist_ok=True)

print(f"Extracting {apk_path}...")
with zipfile.ZipFile(apk_path, "r") as zip_ref:
    zip_ref.extractall(extract_path)
print(f"Extracted to {extract_path}")
