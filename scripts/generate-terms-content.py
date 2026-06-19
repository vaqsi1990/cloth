"""Generate TermsContent.tsx from extracted docx text."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRACT = ROOT / "terms-docx-extract.txt"
OUT = ROOT / "src" / "component" / "rules" / "TermsContent.tsx"

P = "md:text-[18px] text-[16px] leading-relaxed"
H3 = "text-xl font-semibold"


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("{", "&#123;").replace("}", "&#125;")


def p(text: str) -> str:
    return f'                                <p className="{P}">\n                                    {esc(text)}\n                                </p>'


def h3(text: str) -> str:
    return f'                                <h3 className="{H3}">{esc(text)}</h3>'


def section_open() -> str:
    return '                            <section className="space-y-4">'


def section_close() -> str:
    return "                            </section>"


def paras(lines: list[str]) -> list[str]:
    return [p(line) for line in lines]


def term_items(lines: list[str]) -> list[str]:
    out = [
        '                                <div className="space-y-3 md:text-[18px] text-[16px] leading-relaxed mt-4">',
    ]
    for line in lines:
        normalized = line.replace("\u00a0", " ").replace(" – ", " - ")
        if " - " in normalized:
            label, _, rest = normalized.partition(" - ")
            out.append(
                f'                                    <p><span className="font-bold">{esc(label.strip())}</span> - {esc(rest.strip())}</p>'
            )
        else:
            out.append(f"                                    <p>{esc(line)}</p>")
    out.append("                                </div>")
    return out


def bullet_list(items: list[str]) -> list[str]:
    out = [f'                                <ul className="list-disc list-inside space-y-2 {P} ml-4">']
    for item in items:
        out.append(f"                                    <li>{esc(item)}</li>")
    out.append("                                </ul>")
    return out


def contact_block(email_line: str, tel_line: str) -> list[str]:
    email = esc(email_line.split(":", 1)[1].strip())
    tel = esc(tel_line.split(":", 1)[1].strip())
    return [
        '                                <p className="md:text-[18px] text-[16px] leading-relaxed mt-4">',
        f'                                    <span className="font-semibold">მეილი:</span> {email}',
        "                                    <br />",
        f'                                    <span className="font-semibold">ტელ:</span> {tel}',
        "                                </p>",
    ]


def company_contact_block(s_n_line: str, tel_line: str, email_line: str) -> list[str]:
    tel = esc(tel_line.split(":", 1)[1].strip())
    email = esc(email_line.split(":", 1)[1].strip())
    return [
        '                                <p className="md:text-[18px] text-[16px] leading-relaxed">',
        f"                                    {esc(s_n_line)}",
        "                                    <br />",
        f'                                    <span className="font-semibold">ტელ.:</span> {tel}',
        "                                    <br />",
        f'                                    <span className="font-semibold">ელ.ფოსტა.:</span> {email}',
        "                                </p>",
    ]


def main() -> None:
    lines = [ln.strip() for ln in EXTRACT.read_text(encoding="utf-8").splitlines() if ln.strip()]

    if len(lines) > 100 and lines[99].endswith("სურ") and lines[100].startswith("ს "):
        lines[99] = lines[99] + "ს " + lines[100].lstrip("ს ").lstrip()
        del lines[100]

    parts: list[str] = [
        "'use client'",
        "",
        "import React from 'react'",
        "",
        "export default function TermsContent() {",
        "    return (",
        '                        <div className="space-y-6">',
        '                            <h2 className="text-2xl font-bold mb-6">ვადები და პირობები</h2>',
        "",
        section_open(),
        *paras(lines[1:8]),
        section_close(),
        "",
        section_open(),
        h3(lines[8]),
        p(lines[9]),
        *term_items(lines[10:17]),
        section_close(),
        "",
        section_open(),
        h3(lines[17]),
        *paras(lines[18:20]),
        section_close(),
        "",
        section_open(),
        h3(lines[20]),
        *paras(lines[21:31]),
        section_close(),
        "",
        section_open(),
        h3(lines[31]),
        *paras(lines[32:39]),
        section_close(),
        "",
        section_open(),
        h3(lines[39]),
        *paras(lines[40:46]),
        section_close(),
        "",
        section_open(),
        h3(lines[46]),
        *paras(lines[47:49]),
        section_close(),
        "",
        section_open(),
        h3(lines[49]),
        p(lines[50]),
        *contact_block(lines[51], lines[52]),
        section_close(),
        "",
        section_open(),
        h3(lines[53]),
        *paras(lines[54:80]),
        section_close(),
        "",
        section_open(),
        h3(lines[80]),
        *paras(lines[81:86]),
        section_close(),
        "",
        section_open(),
        h3(lines[86]),
        *paras(lines[87:91]),
        section_close(),
        "",
        section_open(),
        h3(lines[91]),
        *paras(lines[92:98]),
        section_close(),
        "",
        section_open(),
        p(lines[98]),
        p(lines[99]),
        *bullet_list(lines[100:108]),
        p(lines[108]),
        *paras(lines[109:113]),
        section_close(),
        "",
        section_open(),
        h3(lines[113]),
        *paras(lines[114:116]),
        section_close(),
        "",
        section_open(),
        h3(lines[116]),
        *company_contact_block(lines[117], lines[118], lines[119]),
        p(lines[120]),
        section_close(),
        "",
        section_open(),
        h3(lines[121]),
        p(lines[122]),
        section_close(),
        "",
        "                        </div>",
        "    )",
        "}",
        "",
    ]

    OUT.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {OUT} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
