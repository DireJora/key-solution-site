from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "documents" / "price-list.pdf"

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))

styles = getSampleStyleSheet()
title = ParagraphStyle(
    "TitleRu", parent=styles["Title"], fontName="Arial-Bold", fontSize=23,
    leading=27, textColor=colors.HexColor("#152533"), alignment=TA_LEFT,
    spaceAfter=7 * mm,
)
subtitle = ParagraphStyle(
    "SubtitleRu", parent=styles["BodyText"], fontName="Arial", fontSize=9.5,
    leading=13, textColor=colors.HexColor("#5c6b76"), spaceAfter=5 * mm,
)
cell = ParagraphStyle(
    "CellRu", parent=styles["BodyText"], fontName="Arial", fontSize=8.2,
    leading=10.5, textColor=colors.HexColor("#152533"),
)
cell_bold = ParagraphStyle(
    "CellBoldRu", parent=cell, fontName="Arial-Bold", textColor=colors.white,
)
note = ParagraphStyle(
    "NoteRu", parent=styles["BodyText"], fontName="Arial", fontSize=8.5,
    leading=12, textColor=colors.HexColor("#5c6b76"),
)

rows = [
    ("Декларация, 1 документ", "от 15 000 ₽", "1-2 рабочих дня"),
    ("От 4 деклараций", "от 10 000 ₽ за документ", "1-2 рабочих дня"),
    ("От 10 деклараций", "от 6 500 ₽ за документ", "1-2 рабочих дня"),
    ("Нотификация РК КНБ (2.19)", "от 20 000 ₽", "до 5 рабочих дней"),
    ("Нотификация ЦЛСЗ ФСБ (2.19)", "от 20 000 ₽", "от 2 недель"),
    ("Лицензирование РЭС и ВЧУ (2.16)", "от 20 000 ₽", "от 5 рабочих дней"),
    ("Техническое исследование СКЗИ (2.19)", "от 10 000 ₽", "до 5 рабочих дней"),
    ("Заключение на товар, предназначающийся для негласного получения информации (2.17)", "от 50 000 ₽", "от 5 до 15 рабочих дней"),
    ("Отказные письма и отрицательные решения", "от 6 500 ₽", "1 рабочий день"),
    ("СТ-1 (экспортный)", "от 15 000 ₽", "от 5 рабочих дней"),
    ("Сертификат соответствия Техническому регламенту", "от 230 000 ₽", "2-3 месяца"),
]

data = [[Paragraph("Услуга", cell_bold), Paragraph("Стоимость", cell_bold), Paragraph("Срок", cell_bold)]]
data.extend([[Paragraph(value, cell) for value in row] for row in rows])

doc = SimpleDocTemplate(
    str(OUTPUT), pagesize=A4, rightMargin=16 * mm, leftMargin=16 * mm,
    topMargin=15 * mm, bottomMargin=15 * mm,
    title="Прайс-лист - Ключевое решение", author="Ключевое решение",
)

table = Table(data, colWidths=[91 * mm, 47 * mm, 40 * mm], repeatRows=1)
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#087f8c")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#d9e2e6")),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f4f7f8")]),
    ("LEFTPADDING", (0, 0), (-1, -1), 7),
    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))

story = [
    Paragraph("Ключевое решение", title),
    Paragraph("Ориентировочные цены и сроки оформления разрешительных документов", subtitle),
    table,
    Spacer(1, 5 * mm),
    Paragraph("Точная стоимость и срок зависят от товара, технических характеристик, количества моделей и требуемой схемы оформления. Предварительная оценка бесплатна.", note),
    Spacer(1, 3 * mm),
    Paragraph("По заявкам: +7 916 587-44-36, Telegram @direjora. Эксперт: 8 916 306-73-18, Telegram @krebrikus, WhatsApp, krebrikus@yandex.ru", note),
]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.build(story)
print(OUTPUT)
