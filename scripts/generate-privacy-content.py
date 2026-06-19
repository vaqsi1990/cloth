"""Generate PrivacyContent.tsx from extracted docx text."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRACT = ROOT / "privacy-docx-extract.txt"
OUT = ROOT / "src" / "component" / "rules" / "PrivacyContent.tsx"

P = 'md:text-[18px] text-[16px] leading-relaxed'
H3 = 'text-xl font-semibold'
TH = 'border border-gray-300 px-4 py-2 text-left font-semibold'
TD = 'border border-gray-300 px-4 py-2'


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("{", "&#123;")
        .replace("}", "&#125;")
    )


def p(text: str, extra: str = "") -> str:
    cls = P + (f" {extra}" if extra else "")
    return f'                                <p className="{cls}">\n                                    {esc(text)}\n                                </p>'


def h3(text: str) -> str:
    return f'                            <section className="space-y-4">\n                                <h3 className="{H3}">{esc(text)}</h3>'


def li(items: list[str]) -> str:
    lines = [
        f'                                <ul className="list-disc list-inside space-y-2 {P} ml-4">'
    ]
    for item in items:
        lines.append(f'                                    <li>{esc(item)}</li>')
    lines.append("                                </ul>")
    return "\n".join(lines)


def close_section() -> str:
    return "                            </section>"


def main() -> None:
    lines = [ln.strip() for ln in EXTRACT.read_text(encoding="utf-8").splitlines() if ln.strip()]

    parts: list[str] = [
        "'use client'",
        "",
        "import React from 'react'",
        "",
        "export default function PrivacyContent() {",
        "    return (",
        "                        <div className=\"space-y-6\">",
        "                            <h2 className=\"text-2xl font-bold mb-6\">პერსონალურ მონაცემთა დაცვის პოლიტიკა</h2>",
        "",
        h3("როგორ ვიყენებთ თქვენს პერსონალურ მონაცემებს"),
        p(lines[2]),
        p(lines[3]),
        close_section(),
        "",
        h3("პერსონალურ მონაცემთა დაცვის დაპირება"),
        p("ჩვენ გპირდებით, რომ:"),
        li(lines[6:9]),
        close_section(),
        "",
        h3("ტერმინთა განმარტება"),
        '                                <div className="space-y-3 md:text-[18px] text-[16px] leading-relaxed">',
    ]
    for term in lines[10:18]:
        parts.append(f'                                    <p>{esc(term)}</p>')
    parts.extend(["                                </div>", close_section(), ""])

    parts.extend([
        h3("ვინ ვართ ჩვენ"),
        p(lines[19]),
        '                                <div className="md:text-[18px] text-[16px] leading-relaxed mt-4 space-y-2">',
        f'                                    <p><span className="font-semibold">საიდენტიფიკაციო კოდი:</span> {esc(lines[20].split(":", 1)[1].strip())}</p>',
        f'                                    <p><span className="font-semibold">იურიდიული მისამართი:</span> {esc(lines[21].split(":", 1)[1].strip())}</p>',
        f'                                    <p><span className="font-semibold">ტელეფონი:</span> {esc(lines[22].split(":", 1)[1].strip())}</p>',
        f'                                    <p><span className="font-semibold">ელ-ფოსტა:</span> {esc(lines[23].split(":", 1)[1].strip())}</p>',
        "                                </div>",
        close_section(),
        "",
        h3("პერსონალურ მონაცემთა დამუშავებაზე უფლებამოსილი პირი"),
        p(lines[26]),
        close_section(),
        "",
        h3("ჩვენ მიერ მონაცემთა დამუშავების პრინციპების დაცვა"),
        p("მონაცემების დამუშავების პროცესში ვიცავთ შემდეგ პრინციპებს:"),
        '                                <div className="space-y-3 md:text-[18px] text-[16px] leading-relaxed mt-4">',
    ])
    for principle in lines[29:36]:
        parts.append(f'                                    <p>{esc(principle)}</p>')
    parts.extend(["                                </div>", close_section(), ""])

    parts.extend([
        h3("რა მიზნით ვამუშავებთ პერსონალურ მონაცემებს"),
        p(lines[37]),
        p("ჩვენ პერსონალურ მონაცემებს ვამუშავებთ შემდეგი კონკრეტული მიზნებით:"),
        li(lines[39:50]),
        close_section(),
        "",
        h3("როგორ გიცავთ კანონი და მომხმარებლის უფლებები"),
        p(lines[51]),
        p("თქვენ გაქვთ უფლება კანონმდებლობით დადგენილ ვადაში მიიღოთ შემდეგი სახის ინფორმაცია:"),
        li(lines[53:62]),
        p("კანონმდებლობის შესაბამისად თქვენ უფლება გაქვთ:"),
        li(lines[63:68]),
        p(lines[68]),
        p(lines[69]),
        p(lines[70]),
        p(lines[71]),
        p(lines[72].replace("  :  :", ":").replace(" :  :", ":")),
        close_section(),
        "",
        h3("GDPR-ის საფუძველზე არსებული სპეციალური ღონისძიებები"),
        p(lines[74]),
        li([lines[75], lines[76]]),
        '                                <ul className="list-disc list-inside space-y-2 md:text-[18px] text-[16px] ml-4 mt-4">',
    ])
    for item in lines[77:83]:
        parts.append(f'                                    <li>{esc(item)}</li>')
    parts.extend(["                                </ul>", close_section(), ""])

    parts.extend([
        h3("არასრულწლოვანთა პერსონალური მონაცემების დაცვა"),
        p(lines[84]),
        close_section(),
        "",
        h3("პერსონალური მონაცემების დამუშავების მიზნები და სამართლებრივი საფუძვლები"),
        p(lines[85]),
        '                                <div className="overflow-x-auto">',
        '                                    <table className="min-w-full border border-gray-300 md:text-[16px] text-[14px]">',
        '                                        <thead>',
        '                                            <tr className="bg-gray-100">',
        f'                                                <th className="{TH}">პერსონალური მონაცემების ტიპები</th>',
        f'                                                <th className="{TH}">რა გზით მოვიპოვებთ პერსონალურ მონაცემებს?</th>',
        f'                                                <th className="{TH}">ჩვენი ლეგიტიმური ინტერესები:</th>',
        f'                                                <th className="{TH}">სამართლებრივი საფუძველი:</th>',
        '                                            </tr>',
        '                                        </thead>',
        '                                        <tbody>',
        '                                            <tr>',
        f'                                                <td className="{TD}">{esc(lines[91])}</td>',
        f'                                                <td className="{TD}">{esc(lines[92])}</td>',
        f'                                                <td className="{TD}">{" ".join(esc(x) for x in lines[93:102])}</td>',
        f'                                                <td className="{TD}">{esc(lines[103])}</td>',
        '                                            </tr>',
        '                                            <tr>',
        f'                                                <td className="{TD}">{esc(lines[104])}</td>',
        f'                                                <td className="{TD}">{"<br /><br />".join(esc(x) for x in lines[105:107])}</td>',
        f'                                                <td className="{TD}">{esc(lines[108])}</td>',
        f'                                                <td className="{TD}">{esc(lines[109])}</td>',
        '                                            </tr>',
        '                                            <tr>',
        f'                                                <td className="{TD}">{"<br /><br />".join(esc(x) for x in lines[110:113])}</td>',
        f'                                                <td className="{TD}">{esc(lines[113])}</td>',
        f'                                                <td className="{TD}">{esc(lines[114])}</td>',
        f'                                                <td className="{TD}">{esc(lines[115])}</td>',
        '                                            </tr>',
        '                                        </tbody>',
        '                                    </table>',
        '                                </div>',
        close_section(),
        "",
        h3("პერსონალური მონაცემების ჯგუფები"),
        p(lines[116]),
        '                                <div className="overflow-x-auto">',
        '                                    <table className="min-w-full border border-gray-300 md:text-[16px] text-[14px]">',
        '                                        <thead>',
        '                                            <tr className="bg-gray-100">',
        f'                                                <th className="{TH}">პერსონალური მონაცემების ტიპები</th>',
        f'                                                <th className="{TH}">აღწერილობა</th>',
        '                                            </tr>',
        '                                        </thead>',
        '                                        <tbody>',
    ])

    group_rows = [
        (lines[119], lines[120]),
        (lines[121], lines[122]),
        (lines[123], lines[124]),
        (lines[125], lines[126]),
        (lines[127], lines[128]),
        (lines[129], lines[130]),
        (lines[131], lines[133]),
        (lines[134], lines[135]),
        (lines[136], lines[137]),
        (lines[138], lines[139]),
        (lines[140], lines[141]),
    ]
    for title, desc in group_rows:
        parts.append(f'                                            <tr>')
        parts.append(f'                                                <td className="{TD} font-semibold">{esc(title)}</td>')
        parts.append(f'                                                <td className="{TD}">{esc(desc)}</td>')
        parts.append('                                            </tr>')

    parts.extend([
        '                                        </tbody>',
        '                                    </table>',
        '                                </div>',
        close_section(),
        "",
        h3("წყაროები, საიდანაც მოვიპოვებთ პერსონალურ მონაცემებს"),
        p(lines[143]),
        p("თქვენგან მონაცემების მიღება ხდება შემდეგ შემთხვევებში:"),
        li(lines[145:151]),
        close_section(),
        "",
        h3("პერსონალური მონაცემების უსაფრთხოება"),
    ])
    for sec_line in lines[152:157]:
        parts.append(p(sec_line))
    parts.append(close_section())

    parts.extend([
        "",
        h3("პერსონალური მონაცემების შენახვის ვადა"),
        p(lines[158]),
        li(lines[159:163]),
        p(lines[163]),
        close_section(),
        "",
        h3('„მზა ჩანაწერები" (Cookies)'),
    ])
    for cookie_line in lines[165:170]:
        parts.append(p(cookie_line))
    parts.append(close_section())

    parts.extend([
        "",
        h3("ავტომატური გადაწყვეტილებების მიღების პროცესი (პროფაილინგი)"),
        p(lines[171]),
        p(lines[172]),
        li(lines[173:176]),
        close_section(),
        "",
        h3("მონაცემთა გადაცემა მესამე მხარისთვის"),
        p(lines[177]),
        li([
            lines[178].lstrip(". ").strip(),
            lines[179].lstrip(". ").strip(),
            lines[180].strip(),
        ]),
        close_section(),
        "",
        h3("პესონალური მონაცემების დამუშავება პირდაპირი მარკეტინგის მიზნებისთვის"),
        p(lines[182]),
        p(lines[183]),
        p(lines[184]),
        close_section(),
        "",
        h3("როგორ გაითხოვოთ თქვენი თანხმობა"),
        p(lines[186]),
        close_section(),
        "",
        h3("პერსონალურ მონაცემთა დაცვის პოლიტიკის დოკუმენტის ცვლილება"),
        p(lines[188]),
        close_section(),
        "",
        h3("მომხმარებელთა კომუნიკაციის მონიტორინგი და ადმინისტრაციის უფლებამოსილება"),
        p(lines[190]),
        p(lines[191]),
        p(lines[192]),
        close_section(),
        "",
        h3("როგორ დაგვიკავშირდეთ"),
        p(lines[194]),
        p(lines[195].replace("E-mail: :", "E-mail:")),
        p(lines[196]),
        close_section(),
        "",
        h3("განახლება"),
        p(lines[198]),
        close_section(),
        "",
        h3("საკონტაქტო ინფორმაცია"),
        '                                <p className="md:text-[18px] text-[16px] leading-relaxed">',
        f'                                    <span className="font-semibold">ტელეფონის ნომერი:</span> {esc(lines[200].split(":", 1)[1].strip())}',
        '                                    <br />',
        f'                                    <span className="font-semibold">ელექტრონული ფოსტა:</span> {esc(lines[201].split(":", 1)[1].strip())}',
        '                                </p>',
        close_section(),
        "",
        "                        </div>",
        "    )",
        "}",
        "",
    ])

    OUT.write_text("\n".join(parts), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
