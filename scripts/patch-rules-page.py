from pathlib import Path

path = Path(__file__).resolve().parents[1] / "src" / "app" / "rules" / "page.tsx"
text = path.read_text(encoding="utf-8")
start = text.index("{activeTab === 'privacy' && (")
end = text.index("{activeTab === 'terms' && <TermsContent />}")
new_block = "{activeTab === 'privacy' && <PrivacyContent />}\n\n                    "
text = text[:start] + new_block + text[end:]
import_line = "import TermsContent from '@/component/rules/TermsContent'"
if "PrivacyContent" not in text:
    text = text.replace(
        import_line,
        import_line + "\nimport PrivacyContent from '@/component/rules/PrivacyContent'",
    )
path.write_text(text, encoding="utf-8")
print("patched", path)
