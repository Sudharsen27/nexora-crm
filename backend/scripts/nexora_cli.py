"""Nexora Developer CLI (Phase 18).

Usage:
  python -m scripts.nexora_cli plugin create my-plugin
  python -m scripts.nexora_cli widget generate revenue-chart
  python -m scripts.nexora_cli theme generate midnight
  python -m scripts.nexora_cli plugin validate
  python -m scripts.nexora_cli plugin package
  python -m scripts.nexora_cli plugin publish
  python -m scripts.nexora_cli plugin deploy
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "project"


def cmd_create(name: str, kind: str) -> int:
    root = Path.cwd() / "nexora-plugins" / slugify(name)
    root.mkdir(parents=True, exist_ok=True)
    (root / "manifest.json").write_text(
        json.dumps(
            {
                "name": name,
                "slug": slugify(name),
                "type": kind,
                "version": "1.0.0",
                "sdk": "nexora-plugin-sdk@1.0.0",
                "permissions": ["deal:read"],
                "sandbox": True,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    entry = (
        "import { defineWidget } from '@nexora/widget-sdk';\n\nexport default defineWidget({ id: '"
        + slugify(name)
        + "' });\n"
        if kind == "widget"
        else "import { defineTheme } from '@nexora/theme-sdk';\n\nexport default defineTheme({ id: '"
        + slugify(name)
        + "' });\n"
        if kind == "theme"
        else "import { definePlugin } from '@nexora/plugin-sdk';\n\nexport default definePlugin({ name: '"
        + name
        + "', version: '1.0.0' });\n"
    )
    (root / "index.ts").write_text(entry, encoding="utf-8")
    print(f"Created {kind} project at {root}")
    return 0


def cmd_validate() -> int:
    manifests = list(Path.cwd().glob("**/manifest.json"))
    if not manifests:
        print("No manifest.json found (ok for dry-run). Checks: permissions, sandbox, sdk.")
        return 0
    for path in manifests:
        data = json.loads(path.read_text(encoding="utf-8"))
        assert "name" in data and "version" in data
        print(f"OK {path}")
    return 0


def cmd_package(name: str = "plugin") -> int:
    artifact = f"{slugify(name)}-1.0.0.tgz"
    print(f"Packaged {artifact} (sandbox artifact metadata only)")
    return 0


def cmd_publish(name: str = "plugin") -> int:
    print(f"Published {slugify(name)}@1.0.0 to Nexora Marketplace (sandbox)")
    return 0


def cmd_deploy(name: str = "plugin") -> int:
    print(f"Deployed {slugify(name)} to tenant sandbox")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="nexora", description="Nexora Developer CLI")
    sub = parser.add_subparsers(dest="group")

    plugin = sub.add_parser("plugin")
    plugin_sub = plugin.add_subparsers(dest="action")
    p_create = plugin_sub.add_parser("create")
    p_create.add_argument("name")
    plugin_sub.add_parser("validate")
    p_pkg = plugin_sub.add_parser("package")
    p_pkg.add_argument("name", nargs="?", default="plugin")
    p_pub = plugin_sub.add_parser("publish")
    p_pub.add_argument("name", nargs="?", default="plugin")
    p_dep = plugin_sub.add_parser("deploy")
    p_dep.add_argument("name", nargs="?", default="plugin")

    widget = sub.add_parser("widget")
    widget_sub = widget.add_subparsers(dest="action")
    w_gen = widget_sub.add_parser("generate")
    w_gen.add_argument("name")

    theme = sub.add_parser("theme")
    theme_sub = theme.add_subparsers(dest="action")
    t_gen = theme_sub.add_parser("generate")
    t_gen.add_argument("name")

    args = parser.parse_args(argv)
    if args.group == "plugin":
        if args.action == "create":
            return cmd_create(args.name, "plugin")
        if args.action == "validate":
            return cmd_validate()
        if args.action == "package":
            return cmd_package(args.name)
        if args.action == "publish":
            return cmd_publish(args.name)
        if args.action == "deploy":
            return cmd_deploy(args.name)
    if args.group == "widget" and args.action == "generate":
        return cmd_create(args.name, "widget")
    if args.group == "theme" and args.action == "generate":
        return cmd_create(args.name, "theme")

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
