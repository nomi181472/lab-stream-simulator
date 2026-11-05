#!/usr/bin/env python3
"""
StreamLab Release & Version Bump Automation.
Updates project version across frontend, backend, and installer, records changelog,
and pushes commit and release tag to GitHub to trigger the release workflow.
"""

import argparse
import datetime
import os
import re
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def get_current_version() -> str:
    version_file = PROJECT_ROOT / "VERSION"
    if version_file.is_file():
        return version_file.read_text(encoding="utf-8").strip()

    package_json = PROJECT_ROOT / "frontend" / "package.json"
    if package_json.is_file():
        match = re.search(r'"version"\s*:\s*"([^"]+)"', package_json.read_text(encoding="utf-8"))
        if match:
            return match.group(1)

    return "1.0.0"


def bump_patch_version(version: str) -> str:
    parts = version.split(".")
    if len(parts) == 3 and all(p.isdigit() for p in parts):
        return f"{parts[0]}.{parts[1]}.{int(parts[2]) + 1}"
    return f"{version}.1"


def run_git(args: list[str], check: bool = True) -> str:
    res = subprocess.run(["git"] + args, cwd=str(PROJECT_ROOT), capture_output=True, text=True)
    if check and res.returncode != 0:
        print(f"[ERROR] git {' '.join(args)} failed:\n{res.stderr.strip()}", file=sys.stderr)
        sys.exit(res.returncode)
    return res.stdout.strip()


def update_version_files(new_version: str):
    # 1. VERSION file
    (PROJECT_ROOT / "VERSION").write_text(f"{new_version}\n", encoding="utf-8")

    # 2. frontend/package.json
    pkg_file = PROJECT_ROOT / "frontend" / "package.json"
    if pkg_file.is_file():
        content = pkg_file.read_text(encoding="utf-8")
        content = re.sub(r'("version"\s*:\s*)"[^"]+"', rf'\g<1>"{new_version}"', content, count=1)
        pkg_file.write_text(content, encoding="utf-8")

    # 3. backend/app/main.py
    main_file = PROJECT_ROOT / "backend" / "app" / "main.py"
    if main_file.is_file():
        content = main_file.read_text(encoding="utf-8")
        content = re.sub(r'(version\s*=\s*)"[^"]+"', rf'\g<1>"{new_version}"', content, count=1)
        main_file.write_text(content, encoding="utf-8")

    # 4. installer/StreamLab.iss
    iss_file = PROJECT_ROOT / "installer" / "StreamLab.iss"
    if iss_file.is_file():
        content = iss_file.read_text(encoding="utf-8")
        content = re.sub(r'(#define\s+MyAppVersion\s+)"[^"]+"', rf'\g<1>"{new_version}"', content, count=1)
        iss_file.write_text(content, encoding="utf-8")


def update_changelog(new_version: str, description: str):
    changelog_file = PROJECT_ROOT / "CHANGELOG.md"
    today = datetime.date.today().isoformat()
    entry = f"## [{new_version}] - {today}\n- {description}\n\n"

    if changelog_file.is_file():
        content = changelog_file.read_text(encoding="utf-8")
        # Insert after the first header block
        pattern = r"(# Changelog\s*\n+.*?\n+)"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            new_content = content[: match.end()] + entry + content[match.end() :]
        else:
            new_content = f"# Changelog\n\n{entry}{content}"
        changelog_file.write_text(new_content, encoding="utf-8")
    else:
        changelog_file.write_text(f"# Changelog\n\n{entry}", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="StreamLab GitHub Release and Version Bump Tool")
    parser.add_argument("-v", "--version", help="New version (e.g. 1.0.1)")
    parser.add_argument("-m", "--desc", help="Short description of changes")
    parser.add_argument("--no-push", action="store_true", help="Commit and tag locally without pushing to GitHub")
    args = parser.parse_args()

    current_ver = get_current_version()
    default_next_ver = bump_patch_version(current_ver)

    print("=========================================================================")
    print(" StreamLab - GitHub Release & Version Publisher")
    print("=========================================================================")
    print(f"Current version: {current_ver}")
    print()

    # 1. Determine new version
    if args.version:
        new_version = args.version.lstrip("v")
    else:
        user_input = input(f"Enter new build version [default: {default_next_ver}]: ").strip()
        new_version = user_input if user_input else default_next_ver

    if not re.match(r"^\d+\.\d+\.\d+", new_version):
        print(f"[ERROR] Version '{new_version}' must follow semantic versioning (e.g. 1.0.1).", file=sys.stderr)
        sys.exit(1)

    # 2. Determine description
    if args.desc:
        description = args.desc.strip()
    else:
        description = input("Enter a brief description of the changes: ").strip()

    if not description:
        description = f"StreamLab release v{new_version}"

    print()
    print("-------------------------------------------------------------------------")
    print(f"Target Version:    v{new_version}")
    print(f"Change Summary:    {description}")
    print("-------------------------------------------------------------------------")
    print()

    # 3. Update files
    print("[1/4] Updating project version numbers...")
    update_version_files(new_version)
    print("  ✓ Updated VERSION")
    print("  ✓ Updated frontend/package.json")
    print("  ✓ Updated backend/app/main.py")
    print("  ✓ Updated installer/StreamLab.iss")

    # 4. Update Changelog
    print("[2/4] Updating CHANGELOG.md...")
    update_changelog(new_version, description)
    print("  ✓ Added release notes to CHANGELOG.md")

    # 5. Git commit & tag
    print("[3/4] Staging and creating git commit and release tag...")
    run_git(["add", "."])
    commit_msg = f"chore(release): v{new_version} - {description}"
    run_git(["commit", "-m", commit_msg])
    tag_name = f"v{new_version}"
    run_git(["tag", "-a", tag_name, "-m", description])
    print(f"  ✓ Created git commit: {commit_msg}")
    print(f"  ✓ Created git tag: {tag_name}")

    # 6. Push to GitHub
    if args.no_push:
        print("[4/4] Skipping push (--no-push requested).")
    else:
        current_branch = run_git(["branch", "--show-current"]) or "main"
        print(f"[4/4] Pushing {current_branch} and tag {tag_name} to GitHub...")
        run_git(["push", "origin", current_branch])
        run_git(["push", "origin", tag_name])
        print("  ✓ Pushed commit and tag to GitHub origin!")

    # 7. Print summary & URL
    remote_url = run_git(["remote", "get-url", "origin"], check=False)
    repo_url = ""
    if "github.com" in remote_url:
        clean = re.sub(r"^git@github\.com:", "https://github.com/", remote_url)
        clean = re.sub(r"\.git$", "", clean)
        repo_url = clean

    print()
    print("=========================================================================")
    print(f"🎉 StreamLab {tag_name} successfully published to GitHub!")
    print("=========================================================================")
    if repo_url:
        print(f"Repository Releases:  {repo_url}/releases")
        print(f"GitHub Actions Run:   {repo_url}/actions")
    print()
    print("GitHub Actions is now automatically building the Windows .EXE installer")
    print(f"and attaching StreamLab-Setup-{new_version}.exe to the GitHub Release!")
    print("=========================================================================")


if __name__ == "__main__":
    main()
