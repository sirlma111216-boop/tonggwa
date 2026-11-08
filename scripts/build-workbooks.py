"""Generate A4 student notebooks and a separate unit-1-1 teacher answer book.

Run after `npm install`: python scripts/build-workbooks.py
Requires reportlab and pypdf. Fonts are embedded from the installed OFL-licensed
Pretendard package; no proprietary system font or source textbook PDF is used.
The same notebooks data drives WorkbookPage. Student files never include answers.
Use --teacher-only to rebuild just the teacher PDF or --unit unit-1-1 for one unit.
"""

from pathlib import Path
import json
import math
import argparse

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


def model_text(c, notebook, index, x, top, width, bottom):
    value = notebook["modelSections"][index]["content"]
    used = text(c, value, x, top, width, size=9.2, leading=13.4)
    if top + used > bottom:
        raise ValueError(f"Model overflows {notebook['id']} section {index + 1}")


def spectrum_example(c, kind, x, top, width):
    """A learning model with a shared 400-700 nm scale, not a measured spectrum."""
    bar_x, bar_w, bar_y, bar_h = x + 6, width - 12, top + 6, 20
    if kind == 1:
        c.setFillColor(HexColor("#101d2d"))
        c.rect(bar_x, H - bar_y - bar_h, bar_w, bar_h, stroke=False, fill=True)
    else:
        stops = [(0, "#7645db"), (.24, "#305fdb"), (.43, "#21b7ba"), (.60, "#8bca4a"), (.72, "#f4d44d"), (1, "#ed5555")]
        for i in range(256):
            t = i / 255
            a, b = next((a, b) for a, b in zip(stops, stops[1:]) if a[0] <= t <= b[0])
            f = (t - a[0]) / (b[0] - a[0])
            ca, cb = HexColor(a[1]), HexColor(b[1])
            c.setFillColorRGB(ca.red + f * (cb.red - ca.red), ca.green + f * (cb.green - ca.green), ca.blue + f * (cb.blue - ca.blue))
            c.rect(bar_x + i * bar_w / 256, H - bar_y - bar_h, bar_w / 256 + .1, bar_h, stroke=False, fill=True)
    for nm in (430, 610) if kind else ():
        px = bar_x + (nm - 400) / 300 * bar_w
        c.setFillColor(HexColor("#182432" if kind == 2 else "#a993ff" if nm == 430 else "#f7aa62"))
        c.rect(px - 1.2, H - bar_y - bar_h, 2.4, bar_h, stroke=False, fill=True)
        text(c, str(nm), px - 7, top + 29, 30, size=6.8, color=MUTED)
    axis_y = top + 46
    rule(c, bar_x, axis_y, bar_x + bar_w, axis_y)
    for nm in (400, 550, 700):
        px = bar_x + (nm - 400) / 300 * bar_w
        rule(c, px, axis_y - 2, px, axis_y + 2)
        text(c, str(nm), px - 7, axis_y + 5, 25, size=6.8, color=MUTED)
    text(c, "파장 (nm) · 학습용 예시", x + 22, top + 66, width - 22, size=7, color=MUTED)


def sections(c, notebook, top=197, height=374, teacher=False):
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
            if teacher:
                model_top = top + heading_height + 12
                if notebook["id"] == "u11-n1":
                    spectrum_example(c, i, x + 11, model_top, col_width - 22)
                    model_top += 91
                model_text(c, notebook, i, x + 11, model_top, col_width - 22, top + height - 10)
            else:
                writing_lines(c, x + 11, top + heading_height + 5, col_width - 22, top + height)
    elif layout == "data":
        row_height = height / len(entries)
        left_width = CONTENT * .32
        for i, section in enumerate(entries):
            y = top + i * row_height
            rect(c, M, y, CONTENT, row_height)
            rect(c, M, y, left_width, row_height, PAPER)
            title_height = text(c, section["label"], M + 11, y + 12, left_width - 22, size=11, bold=True)
            prompt_height = text(c, section["prompt"], M + 11, y + 18 + title_height, left_width - 22, size=9, color=MUTED)
            if 18 + title_height + prompt_height > row_height - 10:
                raise ValueError(f"Prompt overflows {notebook['id']} section {i + 1}")
            if teacher:
                model_text(c, notebook, i, M + left_width + 12, y + 16, CONTENT - left_width - 24, y + row_height - 10)
            else:
                grid(c, M + left_width, y, CONTENT - left_width, row_height)
    else:
        gap = 17
        row_height = (height - gap * (len(entries) - 1)) / len(entries)
        for i, section in enumerate(entries):
            y = top + i * (row_height + gap)
            rect(c, M, y, CONTENT, row_height)
            title_height = text(c, f"{i + 1:02d}  {section['label']}", M + 12, y + 9, CONTENT - 24, size=11, bold=True)
            prompt_height = text(c, section["prompt"], M + 12, y + 13 + title_height, CONTENT - 24, size=9, color=MUTED)
            if teacher:
                model_text(c, notebook, i, M + 12, y + 18 + title_height + prompt_height, CONTENT - 24, y + row_height - 6)
            else:
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


def draw_teacher_sheet(c, notebook, guidance, index, count):
    text(c, "통합과학 학습실  /  교사용 답안 · 구조적 필기장", M, 30, CONTENT, size=9, color=ACCENT, bold=True)
    text(c, f"원소와 우주  ·  {index:02d}", M, 57, CONTENT, size=11, color=MUTED)
    text(c, notebook["title"], M, 77, CONTENT, size=21, bold=True)
    text(c, "학습 목표  " + notebook["goal"], M, 116, CONTENT, size=10, color=MUTED)
    rule(c, M, 157, W - M, 157, ACCENT, 1.2)
    text(c, "표현이 달라도 핵심 관계와 조건이 같으면 인정해 주세요. 학생이 먼저 작성한 뒤 비교합니다.", M, 171, CONTENT, size=9, color=MUTED)
    sections(c, notebook, teacher=True)
    text(c, "확인 기준", M, 586, CONTENT, size=10, bold=True)
    y = 606
    for criterion in notebook["criteria"]:
        y += text(c, "• " + criterion, M, y, CONTENT, size=8.8, leading=13.2) + 2
    if y > 658:
        raise ValueError(f"Criteria overflow {notebook['id']}")
    rect(c, M, 665, CONTENT, 118, PAPER)
    text(c, "흔한 오개념 · 이렇게 짚어 주세요", M + 12, 674, CONTENT - 24, size=10, bold=True)
    y = 695
    for tip in guidance["misconceptions"]:
        y += text(c, "• " + tip, M + 12, y, CONTENT - 24, size=8.5, leading=12.5) + 3
    y += 3
    y += text(c, "확인 질문  " + guidance["ask"], M + 12, y, CONTENT - 24, size=8.5, color=ACCENT, leading=12.5)
    if y > 777:
        raise ValueError(f"Teacher guidance overflow {notebook['id']}: {y}")
    rule(c, M, 797, W - M, 797, LINE, .5)
    text(c, f"{notebook['id']}  ·  교사용 답안 / 학생이 먼저 작성한 뒤 비교해 주세요.", M, 807, CONTENT - 50, size=7.5, color=MUTED)
    text(c, f"{index} / {count}", W - M - 30, 807, 40, size=8, color=MUTED)
    c.showPage()


def build_teacher():
    unit_id = "unit-1-1"
    notebooks = json.loads((ROOT / "content" / "interactives" / f"{unit_id}.json").read_text(encoding="utf-8-sig"))["notebooks"]
    guidance = json.loads((ROOT / "content" / "lessons" / f"{unit_id}-notebook-teacher.json").read_text(encoding="utf-8-sig"))["sheets"]
    assert set(guidance) == {n["id"] for n in notebooks}, "Teacher notes and student sheets must match"
    output = OUT / f"{unit_id}-teacher.pdf"
    c = canvas.Canvas(str(output), pagesize=A4, pageCompression=1)
    c.setTitle("원소와 우주 - 구조적 필기장 교사용 답안")
    c.setAuthor("통합과학 학습실")
    c.setSubject("학생용과 같은 5쪽 구성: 칸별 모범 필기, 확인 기준, 오개념 지도와 확인 질문")
    for index, notebook in enumerate(notebooks, 1):
        assert len(notebook["sections"]) == len(notebook["modelSections"]) == 3
        assert [s["label"] for s in notebook["sections"]] == [s["label"] for s in notebook["modelSections"]]
        draw_teacher_sheet(c, notebook, guidance[notebook["id"]], index, len(notebooks))
    c.save()
    reader = PdfReader(output)
    assert len(reader.pages) == len(notebooks) == 5
    for page, notebook in zip(reader.pages, notebooks):
        extracted = "".join(page.extract_text().split())
        for expected in [notebook["id"], notebook["title"], "교사용 답안", *notebook["criteria"], guidance[notebook["id"]]["ask"], *[s["content"] for s in notebook["modelSections"]]]:
            assert "".join(expected.split()) in extracted, f"Missing teacher content: {notebook['id']} {expected}"
        assert any(font.get_object().get("/FontDescriptor") and "/FontFile2" in font.get_object()["/FontDescriptor"].get_object() for font in page["/Resources"]["/Font"].get_object().values()), "Missing embedded font"
    print(f"Created {output.relative_to(ROOT)} ({len(reader.pages)} A4 pages; all answers, criteria, and prompts verified)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--teacher-only", action="store_true")
    parser.add_argument("--unit", choices=("unit-1-1", "unit-1-2"))
    args = parser.parse_args()
    if args.teacher_only and args.unit == "unit-1-2":
        parser.error("The teacher answer book is currently available for unit-1-1 only")
    OUT.mkdir(parents=True, exist_ok=True)
    if not args.teacher_only:
        for unit in (args.unit,) if args.unit else ("unit-1-1", "unit-1-2"):
            build(unit)
    if args.unit != "unit-1-2":
        build_teacher()
