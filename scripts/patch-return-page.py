from pathlib import Path

path = Path(__file__).resolve().parents[1] / "src" / "app" / "rules" / "page.tsx"
text = path.read_text(encoding="utf-8")
start = text.index("{activeTab === 'return' && (")
end = text.index("{activeTab === 'coockies' && (")
new_block = "{activeTab === 'return' && <ReturnContent />}\n\n                    "
text = text[:start] + new_block + text[end:]
import_line = "import PrivacyContent from '@/component/rules/PrivacyContent'"
if "ReturnContent" not in text.split(import_line)[0]:
    text = text.replace(
        import_line,
        import_line + "\nimport ReturnContent from '@/component/rules/ReturnContent'",
    )
path.write_text(text, encoding="utf-8")
print("patched", path)
