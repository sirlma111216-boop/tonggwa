"""Generate answer-free A4 student notebooks from the authored pilot content.

Run after `npm install`: python scripts/build-workbooks.py
Requires reportlab and pypdf. Fonts are embedded from the installed OFL-licensed
Pretendard package; no proprietary system font or source textbook PDF is used.
The same notebooks data drives WorkbookPage. Never print model/criteria fields.
"""

from pathlib import Path
import json
import math

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "workbooks"
FONT_DIR = ROOT / "node_modules" / "pretendard" / "dist" / "public" / "static" / "alternative"
pdfmetrics.registerFont(TTFont("Pretendard", str(FONT_DIR / "Pretendard-Regular.ttf")))
pdfmetrics.registerFont(TTFont("PretendardBold", str(FONT_DIR / "Pretendard-Bold.ttf")))

INK = HexColor("#202d3a")
MUTED = HexColor("#65727d")
LINE = HexColor("#b9c6cc")
FAINT = HexColor("#dfe6e9")
PAPER = HexColor("#f3f6f7")
ACCENT = HexColor("#27676b")
W, H = A4
M = 39
CONTENT = W - 2 * M


def wrap(text, width, size=10, font="Pretendard"):
    """Character-aware wrapping for Korean and explicit paragraph breaks."""
    lines = []
    for paragraph in text.split("\n"):
        line = ""
        for char in paragraph:
            if line and pdfmetrics.stringWidth(line + char, font, size) > width:
                lines.append(line.rstrip())
                line = char.lstrip()
            else:
                line += char
        lines.append(line)
    return lines


def text(c, value, x, top, width, size=10, color=INK, bold=False, leading=None):
    font = "PretendardBold" if bold else "Pretendard"
    lines = wrap(value, width, size, font)
    leading = leading or size * 1.5
    c.setFillColor(color)
    c.setFont(font, size)
    for i, line in enumerate(lines):
        c.drawString(x, H - top - size - i * leading, line)
    return len(lines) * leading


def rule(c, x1, y1, x2, y2, color=LINE, weight=.55):
    c.setStrokeColor(color)
    c.setLineWidth(weight)
    c.line(x1, H - y1, x2, H - y2)


def rect(c, x, top, width, height, fill=None):
    c.setStrokeColor(LINE)
    c.setLineWidth(.65)
    if fill:
        c.setFillColor(fill)
    c.rect(x, H - top - height, width, height, fill=bool(fill), stroke=True)


def writing_lines(c, x, top, width, bottom, spacing=22):
    y = top + spacing
    while y < bottom - 6:
        rule(c, x, y, x + width, y, FAINT, .4)
        y += spacing


def grid(c, x, top, width, height, spacing=12):
    c.setStrokeColor(FAINT)
    c.setLineWidth(.25)
    for n in range(1, math.ceil(width / spacing)):
        dx = n * spacing
        if dx < width:
            rule(c, x + dx, top, x + dx, top + height, FAINT, .25)
    for n in range(1, math.ceil(height / spacing)):
        dy = n * spacing
        if dy < height:
            rule(c, x, top + dy, x + width, top + dy, FAINT, .25)


def arrow(c, x, top, bottom):
    rule(c, x, top, x, bottom, MUTED, .8)
    rule(c, x - 3, bottom - 4, x, bottom, MUTED, .8)
    rule(c, x + 3, bottom - 4, x, bottom, MUTED, .8)


def checkbox(c, label, x, top, width):
    rect(c, x, top + 3, 8, 8)
    return text(c, label, x + 15, top, width - 15, size=8.6, color=MUTED)


def sections(c, notebook, top=197, height=374):
    entries = notebook["sections"]
    layout = notebook["layout"]
    if layout == "compare":
        col_width = CONTENT / len(entries)
        # Equal heading bands keep all comparison columns aligned.
        heading_height = max(
            len(wrap(s["label"], col_width - 22, 11, "PretendardBold")) * 16.5
            + len(wrap(s["prompt"], col_width - 22, 9)) * 13.5 + 31
            for s in entries
        )
        for i, section in enumerate(entries):
            x = M + i * col_width
            rect(c, x, top, col_width, height)
            rect(c, x, top, col_width, heading_height, PAPER)
            title_height = text(c, section["label"], x + 11, top + 12, col_width - 22, size=11, bold=True)
            text(c, section["prompt"], x + 11, top + 18 + title_height, col_width - 22, size=9, color=MUTED)
            writing_lines(c, x + 11, top + heading_height + 5, col_width - 22, top + height)
    elif layout == "data":
        row_height = height / len(entries)
        left_width = CONTENT * .32
        for i, section in enumerate(entries):
            y = top + i * row_height
            rect(c, M, y, CONTENT, row_height)
            rect(c, M, y, left_width, row_height, PAPER)
            title_height = text(c, section["label"], M + 11, y + 12, left_width - 22, size=11, bold=True)
            text(c, section["prompt"], M + 11, y + 18 + title_height, left_width - 22, size=9, color=MUTED)
            grid(c, M + left_width, y, CONTENT - left_width, row_height)
    else:
        gap = 17
        row_height = (height - gap * (len(entries) - 1)) / len(entries)
        for i, section in enumerate(entries):
            y = top + i * (row_height + gap)
            rect(c, M, y, CONTENT, row_height)
            title_height = text(c, f"{i + 1:02d}  {section['label']}", M + 12, y + 9, CONTENT - 24, size=11, bold=True)
            prompt_height = text(c, section["prompt"], M + 12, y + 13 + title_height, CONTENT - 24, size=9, color=MUTED)
            writing_lines(c, M + 12, y + 13 + title_height + prompt_height, CONTENT - 24, y + row_height)
            if i < len(entries) - 1:
                arrow(c, W / 2, y + row_height + 3, y + row_height + gap - 3)


def draw_sheet(c, unit_id, notebook, index, count):
    title = "원소와 우주" if unit_id == "unit-1-1" else "별과 생명"
    c.setTitle(f"{title} - 구조적 필기장")
    c.setAuthor("통합과학 학습실")
    c.setSubject("학생 작성용 빈 양식: 제목과 목표가 인쇄되어 있으며 모범 답안은 포함하지 않습니다.")
    text(c, "통합과학 학습실  /  구조적 필기장", M, 30, CONTENT, size=9, color=ACCENT, bold=True)
    text(c, f"{title}  ·  {index:02d}", M, 57, CONTENT, size=11, color=MUTED)
    title_height = text(c, notebook["title"], M, 77, CONTENT, size=21, bold=True)
    if title_height > 35:
        raise ValueError(f"Title too long for one line: {notebook['id']}")
    goal_height = text(c, "학습 목표  " + notebook["goal"], M, 116, CONTENT, size=10, color=MUTED)
    if goal_height > 31:
        raise ValueError(f"Goal too long: {notebook['id']}")
    rule(c, M, 157, W - M, 157, ACCENT, 1.2)
    text(c, "화면을 잠시 덮고, 핵심 관계를 내 말·그림·기호로 채워 보세요. 모르는 곳은 ?로 남겨도 괜찮아요.", M, 171, CONTENT, size=9, color=MUTED)
    sections(c, notebook)

    text(c, "모범 필기를 보기 전", M, 590, CONTENT, size=10, bold=True)
    checkbox(c, "기억에서 꺼내 적었어요", M, 611, 172)
    checkbox(c, "관계·조건을 표시했어요", M + 177, 611, 172)
    checkbox(c, "확인할 곳에 ?를 남겼어요", M + 354, 611, 165)
    rect(c, M, 644, CONTENT, 104)
    text(c, "비교하고 고치기", M + 12, 653, CONTENT - 24, size=11, bold=True)
    text(c, "앱에서 ‘필기했어요’를 누른 뒤 비교해요. 다른 색으로 빠진 관계와 수정한 이유를 적어 보세요.", M + 12, 675, CONTENT - 24, size=8.8, color=MUTED)
    writing_lines(c, M + 12, 691, CONTENT - 24, 743, spacing=21)
    checkbox(c, "핵심이 같아요", M, 765, 140)
    checkbox(c, "고쳐서 이해했어요", M + 153, 765, 160)
    checkbox(c, "다시 확인하고 싶어요", M + 329, 765, 184)
    rule(c, M, 797, W - M, 797, LINE, .5)
    text(c, f"{notebook['id']}  ·  제목과 목표는 이미 인쇄되어 있어요. 구조만 채우세요.", M, 807, CONTENT - 50, size=7.5, color=MUTED)
    text(c, f"{index} / {count}", W - M - 30, 807, 40, size=8, color=MUTED)
    c.showPage()


def build(unit_id):
    source = ROOT / "content" / "interactives" / f"{unit_id}.json"
    payload = json.loads(source.read_text(encoding="utf-8-sig"))
    notebooks = payload["notebooks"]
    if not notebooks:
        raise ValueError(f"No notebooks in {source}")
    for notebook in notebooks:
        if len(notebook["sections"]) != 3:
            raise ValueError(f"A4 template expects exactly three sections: {notebook['id']}")
    output = OUT / f"{unit_id}-notebook.pdf"
    c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
    for index, notebook in enumerate(notebooks, 1):
        draw_sheet(c, unit_id, notebook, index, len(notebooks))
    c.save()
    reader = PdfReader(output)
    assert len(reader.pages) == len(notebooks)
    for page, notebook in zip(reader.pages, notebooks):
        extracted = page.extract_text()
        assert notebook["id"] in extracted
        assert notebook["title"] in extracted
        assert notebook["model"] not in extracted, "Model answer leaked onto blank sheet"
        fonts = page["/Resources"]["/Font"].get_object()
        embedded = []
        for font in fonts.values():
            descriptor = font.get_object().get("/FontDescriptor")
            if descriptor is not None:
                embedded.append("/FontFile2" in descriptor.get_object())
        assert any(embedded), "Missing embedded font"
    print(f"Created {output.relative_to(ROOT)} ({len(reader.pages)} A4 pages)")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for unit in ("unit-1-1", "unit-1-2"):
        build(unit)
