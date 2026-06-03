#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate 3 TIREA PDF reports in Traditional Chinese"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os, sys

# ── Font setup ──────────────────────────────────────────────────────────────
FONT_REGULAR_PATH = "/System/Library/Fonts/STHeiti Light.ttc"
FONT_BOLD_PATH    = "/System/Library/Fonts/STHeiti Medium.ttc"

pdfmetrics.registerFont(TTFont('STHeitiLight',  FONT_REGULAR_PATH, subfontIndex=0))
pdfmetrics.registerFont(TTFont('STHeitiMedium', FONT_BOLD_PATH,    subfontIndex=0))

FONT      = 'STHeitiLight'
FONT_BOLD = 'STHeitiMedium'

# ── Colors ───────────────────────────────────────────────────────────────────
NAVY    = colors.HexColor('#0f172a')
GOLD    = colors.HexColor('#c89b3c')
LIGHT   = colors.HexColor('#f8fafc')
SLATE   = colors.HexColor('#64748b')
BORDER  = colors.HexColor('#e2e8f0')
RED_SOFT = colors.HexColor('#fef2f2')
GREEN_SOFT = colors.HexColor('#f0fdf4')
BLUE_SOFT = colors.HexColor('#eff6ff')
EMERALD = colors.HexColor('#059669')

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public_reports')
os.makedirs(OUT_DIR, exist_ok=True)

# ── Common styles ────────────────────────────────────────────────────────────
def make_styles():
    return {
        'title':    ParagraphStyle('title',    fontName=FONT_BOLD, fontSize=26, leading=34, textColor=colors.white,       spaceAfter=6),
        'subtitle': ParagraphStyle('subtitle', fontName=FONT,      fontSize=13, leading=20, textColor=colors.HexColor('#cbd5e1'), spaceAfter=4),
        'h1':       ParagraphStyle('h1',       fontName=FONT_BOLD, fontSize=18, leading=26, textColor=NAVY,               spaceBefore=14, spaceAfter=6),
        'h2':       ParagraphStyle('h2',       fontName=FONT_BOLD, fontSize=14, leading=20, textColor=NAVY,               spaceBefore=10, spaceAfter=4),
        'body':     ParagraphStyle('body',     fontName=FONT,      fontSize=10, leading=17, textColor=colors.HexColor('#334155'), spaceAfter=6),
        'small':    ParagraphStyle('small',    fontName=FONT,      fontSize=8.5,leading=13, textColor=SLATE),
        'tag':      ParagraphStyle('tag',      fontName=FONT_BOLD, fontSize=8,  leading=12, textColor=GOLD,               spaceBefore=6, spaceAfter=2),
        'bullet':   ParagraphStyle('bullet',   fontName=FONT,      fontSize=10, leading=17, textColor=colors.HexColor('#334155'), leftIndent=12, spaceAfter=3),
        'caption':  ParagraphStyle('caption',  fontName=FONT,      fontSize=8,  leading=12, textColor=SLATE,              spaceAfter=4),
        'footer':   ParagraphStyle('footer',   fontName=FONT,      fontSize=8,  leading=12, textColor=SLATE,              alignment=1),
        'th':       ParagraphStyle('th',       fontName=FONT_BOLD, fontSize=9,  leading=14, textColor=colors.white),
        'td':       ParagraphStyle('td',       fontName=FONT,      fontSize=9,  leading=14, textColor=NAVY),
        'tds':      ParagraphStyle('tds',      fontName=FONT,      fontSize=8.5,leading=13, textColor=SLATE),
    }

W, H = A4  # 595 x 842 pt

def cover_page(canvas, doc, title, subtitle, report_num, date_str, color_accent):
    """Draw a full-bleed cover page."""
    canvas.saveState()
    # Background
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Accent bar
    canvas.setFillColor(color_accent)
    canvas.rect(0, H - 8, W, 8, fill=1, stroke=0)
    # Bottom bar
    canvas.setFillColor(color_accent)
    canvas.setFillAlpha(0.15)
    canvas.rect(0, 0, W, 120, fill=1, stroke=0)
    canvas.setFillAlpha(1)
    # TIREA logo text
    canvas.setFont(FONT_BOLD, 14)
    canvas.setFillColor(color_accent)
    canvas.drawString(40, H - 50, 'TIREA')
    canvas.setFont(FONT, 9)
    canvas.setFillColor(colors.HexColor('#94a3b8'))
    canvas.drawString(40, H - 65, '台灣國際不動產交流協會')
    # Report number badge
    canvas.setFont(FONT_BOLD, 9)
    canvas.setFillColor(color_accent)
    canvas.drawRightString(W - 40, H - 50, f'REPORT #{report_num:02d}')
    # Title
    canvas.setFont(FONT_BOLD, 28)
    canvas.setFillColor(colors.white)
    # Word-wrap title manually
    words = title
    canvas.drawString(40, H/2 + 40, words)
    # Subtitle
    canvas.setFont(FONT, 13)
    canvas.setFillColor(colors.HexColor('#94a3b8'))
    canvas.drawString(40, H/2 + 10, subtitle)
    # Divider
    canvas.setStrokeColor(color_accent)
    canvas.setLineWidth(1.5)
    canvas.line(40, H/2 - 5, W - 40, H/2 - 5)
    # Date / version
    canvas.setFont(FONT, 9)
    canvas.setFillColor(colors.HexColor('#64748b'))
    canvas.drawString(40, 40, f'發布日期：{date_str}　　版本：2026 第一版')
    canvas.drawRightString(W - 40, 40, 'www.tirea.com.tw')
    canvas.restoreState()

def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(40, 30, W - 40, 30)
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(SLATE)
    canvas.drawString(40, 18, '© 2026 TIREA 台灣國際不動產交流協會　本報告僅供參考，不構成投資建議。')
    canvas.drawRightString(W - 40, 18, f'第 {doc.page} 頁')
    canvas.restoreState()

def table_style(header_color=NAVY):
    return TableStyle([
        ('BACKGROUND', (0,0), (-1,0), header_color),
        ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
        ('FONTNAME',   (0,0), (-1,0), FONT_BOLD),
        ('FONTSIZE',   (0,0), (-1,0), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('FONTNAME',   (0,1), (-1,-1), FONT),
        ('FONTSIZE',   (0,1), (-1,-1), 9),
        ('GRID',       (0,0), (-1,-1), 0.5, BORDER),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING',(0,0),(-1,-1), 6),
        ('LEFTPADDING',(0,0), (-1,-1), 8),
        ('RIGHTPADDING',(0,0),(-1,-1), 8),
    ])

# ══════════════════════════════════════════════════════════════════════════════
# REPORT 1: 2026 曼谷投資市場報告
# ══════════════════════════════════════════════════════════════════════════════
def build_bangkok_report():
    path = os.path.join(OUT_DIR, 'tirea-bangkok-2026.pdf')
    S = make_styles()
    doc = SimpleDocTemplate(path, pagesize=A4,
        leftMargin=40, rightMargin=40, topMargin=50, bottomMargin=50)

    story = []

    # --- Cover (via onFirstPage) ---
    # We use a first-page template trick via later canvas callback
    # Instead, insert a blank Spacer and rely on onPage
    story.append(Spacer(1, H - 120))
    story.append(PageBreak())

    # --- Page 2: TOC & Intro ---
    story.append(Paragraph('目錄', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1, color=GOLD, spaceAfter=10))
    toc_data = [
        ['01', '曼谷市場總覽 2026'],
        ['02', '四大核心投資區域分析'],
        ['03', '租金報酬與空置率數據'],
        ['04', '捷運路線與投資紅利地圖'],
        ['05', '建案精選：四大標的一覽'],
        ['06', '外資持有規範與購買流程'],
        ['07', '風險提示與投資建議'],
    ]
    for num, title in toc_data:
        story.append(Paragraph(f'<font color="#c89b3c"><b>{num}</b></font>　　{title}', S['body']))
        story.append(HRFlowable(width='100%', thickness=0.3, color=BORDER, spaceAfter=4))

    story.append(Spacer(1, 12))
    story.append(Paragraph('前言', S['h1']))
    story.append(Paragraph(
        '曼谷是東南亞最具活力的不動產市場之一。近年來受惠於泰國政府推動的 EEC 東部經濟走廊、'
        '多條捷運新線同步建設，以及外籍人士持續增長的租屋需求，吸引大量亞洲投資人關注。'
        '本報告由 TIREA 台灣國際不動產交流協會整理，針對 2026 年曼谷市場提供最新數據與分析，'
        '協助台灣投資人在進場前掌握完整資訊。', S['body']))
    story.append(PageBreak())

    # --- Section 01 ---
    story.append(Paragraph('01　曼谷市場總覽 2026', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    kpi_data = [
        [Paragraph('指標', S['th']), Paragraph('數值', S['th']), Paragraph('備註', S['th'])],
        [Paragraph('平均年化租金報酬', S['td']), Paragraph('6.5 – 8.2%', S['td']), Paragraph('BTS/MRT 沿線核心公寓', S['tds'])],
        [Paragraph('近 5 年核心區漲幅', S['td']), Paragraph('+38%', S['td']), Paragraph('Phaya Thai / Thong Lo 為主', S['tds'])],
        [Paragraph('外資持有上限', S['td']), Paragraph('49%', S['td']), Paragraph('公寓大樓外籍比例上限', S['tds'])],
        [Paragraph('外資資本利得稅', S['td']), Paragraph('0%', S['td']), Paragraph('泰國無資本利得稅', S['tds'])],
        [Paragraph('年持有稅率', S['td']), Paragraph('約 0.3%', S['td']), Paragraph('低於日本 1.4%', S['tds'])],
        [Paragraph('入境旅客人次 (2025)', S['td']), Paragraph('3,500 萬', S['td']), Paragraph('全球前三旅遊城市', S['tds'])],
        [Paragraph('在曼日本外派人數', S['td']), Paragraph('12 萬+', S['td']), Paragraph('帶動 Thong Lo / Ekkamai 租需', S['tds'])],
    ]
    t = Table(kpi_data, colWidths=[150, 100, 220])
    t.setStyle(table_style(NAVY))
    story.append(t)
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        '曼谷房市的核心優勢在於「低稅負 + 高租需 + 低門檻」的組合。相較於東京、新加坡、澳洲，'
        '台幣 300 – 600 萬即可在核心區入場，適合首次海外置產的投資人分散資產配置。', S['body']))

    # --- Section 02 ---
    story.append(Paragraph('02　四大核心投資區域分析', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))

    zones = [
        ('Phaya Thai', 'BTS 空鐵 + ARL 機場快線 雙鐵交會', '6.8 – 8.0%', '300 – 550 萬', '外派族、通勤族、醫療商圈'),
        ('Rama 9', 'MRT 藍線｜新 CBD 核心', '6.5 – 7.5%', '400 – 700 萬', '跨國企業白領、新興商辦聚集'),
        ('Ramkhamhaeng', 'MRT 橙色線（2026 通車）', '7.0 – 8.5%', '200 – 400 萬', '學區高投報、空置率低'),
        ('Thong Lo', 'BTS 素坤逸線精華段', '6.0 – 7.0%', '600 – 1,500 萬', '日系外派、高消費力，豪宅市場'),
    ]
    zone_data = [[
        Paragraph('區域', S['th']),
        Paragraph('交通優勢', S['th']),
        Paragraph('租金報酬', S['th']),
        Paragraph('入場價（台幣）', S['th']),
        Paragraph('主要租客群', S['th']),
    ]]
    for z in zones:
        zone_data.append([Paragraph(z[i], S['td'] if i > 0 else S['td']) for i in range(5)])
    t2 = Table(zone_data, colWidths=[70, 100, 65, 85, 115])
    t2.setStyle(table_style(colors.HexColor('#1e3a8a')))
    story.append(t2)
    story.append(PageBreak())

    # --- Section 03 ---
    story.append(Paragraph('03　租金報酬與空置率', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        '曼谷核心公寓的租金報酬受三大因素驅動：捷運可及性、外籍租客密度、以及建案設施等級。'
        '以下為各類物業類型的參考數據：', S['body']))

    rent_data = [
        [Paragraph('物業類型', S['th']), Paragraph('月租行情（泰銖）', S['th']), Paragraph('空置率', S['th']), Paragraph('主要租客', S['th'])],
        [Paragraph('BTS 沿線核心公寓 (1BR)', S['td']), Paragraph('15,000 – 30,000', S['td']), Paragraph('< 5%', S['td']), Paragraph('外派族、年輕白領', S['tds'])],
        [Paragraph('新 CBD 複層 Loft (1.5BR)', S['td']), Paragraph('20,000 – 45,000', S['td']), Paragraph('< 8%', S['td']), Paragraph('企業白領、品牌委管', S['tds'])],
        [Paragraph('學區型套房 (Studio)', S['td']), Paragraph('8,000 – 15,000', S['td']), Paragraph('< 7%', S['td']), Paragraph('學生、年輕上班族', S['tds'])],
        [Paragraph('豪宅公寓 Thong Lo (2BR)', S['td']), Paragraph('50,000 – 120,000', S['td']), Paragraph('< 10%', S['td']), Paragraph('日系外派、高管', S['tds'])],
    ]
    t3 = Table(rent_data, colWidths=[140, 120, 70, 105])
    t3.setStyle(table_style(NAVY))
    story.append(t3)

    # --- Section 04 ---
    story.append(Spacer(1, 14))
    story.append(Paragraph('04　捷運路線與投資紅利', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    mrt_data = [
        [Paragraph('路線', S['th']), Paragraph('狀態', S['th']), Paragraph('受益區域', S['th']), Paragraph('預估增值潛力', S['th'])],
        [Paragraph('BTS 素坤逸線延伸', S['td']), Paragraph('營運中', S['td']), Paragraph('Phaya Thai、Thong Lo', S['tds']), Paragraph('★★★★★', S['td'])],
        [Paragraph('MRT 橙色線', S['td']), Paragraph('2026 通車', S['td']), Paragraph('Ramkhamhaeng、CBD', S['tds']), Paragraph('★★★★☆', S['td'])],
        [Paragraph('MRT 棕色線', S['td']), Paragraph('建設中', S['td']), Paragraph('北曼谷新興區', S['tds']), Paragraph('★★★☆☆', S['td'])],
        [Paragraph('ARL 機場快線', S['td']), Paragraph('營運中', S['td']), Paragraph('Phaya Thai（雙鐵）', S['tds']), Paragraph('★★★★★', S['td'])],
    ]
    t4 = Table(mrt_data, colWidths=[120, 80, 150, 85])
    t4.setStyle(table_style(colors.HexColor('#065f46')))
    story.append(t4)
    story.append(PageBreak())

    # --- Section 05 ---
    story.append(Paragraph('05　5/19 考察精選建案', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    cases = [
        ('XT-Phaya Thai', 'Phaya Thai', 'Sansiri', '雙鐵共構 · 現代地標', '330 – 600 萬', '7.0 – 8.0%'),
        ('Cassia Rama 9', 'Rama 9', 'Banyan Tree', '品牌委管 · Loft 複層', '450 – 750 萬', '6.5 – 7.5%'),
        ('Modiz Rhyme', 'Ramkhamhaeng', 'Ananda', '學區高投報 · 捷運旁', '220 – 380 萬', '7.5 – 8.5%'),
        ('Chewathai Thong Lo', 'Thong Lo', 'Chewathai', '低密度奢華 · 垂直綠化', '700 – 1,400 萬', '6.0 – 7.0%'),
    ]
    case_data = [[
        Paragraph('建案名稱', S['th']),
        Paragraph('區域', S['th']),
        Paragraph('開發商', S['th']),
        Paragraph('特色', S['th']),
        Paragraph('參考價位（台幣）', S['th']),
        Paragraph('預估租報', S['th']),
    ]]
    for c in cases:
        case_data.append([Paragraph(x, S['td']) for x in c])
    t5 = Table(case_data, colWidths=[90, 60, 60, 90, 100, 65])
    t5.setStyle(table_style(NAVY))
    story.append(t5)

    # --- Section 06 ---
    story.append(Spacer(1, 14))
    story.append(Paragraph('06　外資持有規範', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    rules = [
        '✓ 外籍人士可直接持有公寓（Condominium Unit），無需設立公司',
        '✓ 整棟大樓外籍持有比例不超過 49%（泰國法律規定）',
        '✓ 別墅與土地需透過泰國公司或長期地上權（Leasehold 30+30 年）持有',
        '✓ 購屋資金須從境外匯入，並取得 FET 外匯交易憑證',
        '✓ 轉售時無資本利得稅，僅需繳納約 3.3% 的轉讓稅費',
        '✓ 持有期間年稅費約為 0.3%（遠低於日本 1.4%、澳洲 1-2%）',
    ]
    for r in rules:
        story.append(Paragraph(r, S['bullet']))
    story.append(PageBreak())

    # --- Section 07 ---
    story.append(Paragraph('07　風險提示', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    risks = [
        ('匯率風險', '泰銖兌台幣長期相對穩定，但仍有波動風險，建議分批匯款'),
        ('空置風險', '選擇捷運 500m 內、租客需求明確的地段可有效降低空置率'),
        ('政治風險', '泰國過去有政治不穩定紀錄，建議評估長期持有策略'),
        ('工程延遲', '期房（Pre-sale）存在交屋延遲風險，建議選擇信譽良好的開發商'),
        ('法規異動', '外資持有比例規定可能調整，請持續追蹤泰國土地部公告'),
    ]
    risk_data = [[Paragraph('風險類型', S['th']), Paragraph('說明', S['th'])]]
    for rk in risks:
        risk_data.append([Paragraph(rk[0], S['td']), Paragraph(rk[1], S['tds'])])
    t6 = Table(risk_data, colWidths=[90, 345])
    t6.setStyle(table_style(colors.HexColor('#7f1d1d')))
    story.append(t6)
    story.append(Spacer(1, 20))

    # CTA
    cta_data = [[
        Paragraph('想進一步了解？', S['h2']),
    ],[
        Paragraph(
            '加入 TIREA LINE 官方帳號：@180phkse\n'
            '或造訪官網：www.tirea.com.tw\n'
            '5/19–22 曼谷考察團 NT$9,999 起，限額報名中。',
            S['body'])
    ]]
    cta = Table(cta_data, colWidths=[435])
    cta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fffbeb')),
        ('LEFTPADDING', (0,0), (-1,-1), 16),
        ('RIGHTPADDING', (0,0), (-1,-1), 16),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('BOX', (0,0), (-1,-1), 1.5, GOLD),
        ('ROUNDEDCORNERS', (0,0), (-1,-1), [6,6,6,6]),
    ]))
    story.append(cta)

    # Build with cover on first page
    def on_first_page(canvas, doc):
        cover_page(canvas, doc, '2026 曼谷投資市場報告',
                   '四大核心區分析 · 租金報酬 · 捷運紅利地圖', 1,
                   '2026 年 4 月', GOLD)

    def on_later_pages(canvas, doc):
        add_footer(canvas, doc)

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(f'✅ Created: {path}')
    return path


# ══════════════════════════════════════════════════════════════════════════════
# REPORT 2: 海外置產入門完整指南
# ══════════════════════════════════════════════════════════════════════════════
def build_guide_report():
    path = os.path.join(OUT_DIR, 'tirea-overseas-guide.pdf')
    S = make_styles()
    doc = SimpleDocTemplate(path, pagesize=A4,
        leftMargin=40, rightMargin=40, topMargin=50, bottomMargin=50)
    story = []

    story.append(Spacer(1, H - 120))
    story.append(PageBreak())

    # TOC
    story.append(Paragraph('目錄', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1, color=GOLD, spaceAfter=10))
    for num, title in [
        ('01', '為什麼選擇海外房產投資'),
        ('02', '六大市場快速比較'),
        ('03', '選市場的正確邏輯'),
        ('04', '外資購屋規定總覽'),
        ('05', '稅務架構與持有成本'),
        ('06', '資金匯款流程（台灣出發）'),
        ('07', '常見錯誤與注意事項'),
        ('08', '下一步：如何開始'),
    ]:
        story.append(Paragraph(f'<font color="#c89b3c"><b>{num}</b></font>　　{title}', S['body']))
        story.append(HRFlowable(width='100%', thickness=0.3, color=BORDER, spaceAfter=4))

    story.append(PageBreak())

    # 01
    story.append(Paragraph('01　為什麼選擇海外房產投資', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    reasons = [
        ('資產分散', '將資產配置於不同貨幣與市場，降低單一市場風險'),
        ('租金現金流', '部分市場（如泰國、越南）租金報酬達 6–9%，優於台灣 2–3%'),
        ('資本增值', '新興市場基建快速發展，早期進場享有更高增值空間'),
        ('低門檻入場', '曼谷、吉隆坡等市場台幣 300–500 萬即可入場'),
        ('貨幣對沖', '以強勢貨幣（日圓除外）持有資產，對沖台幣風險'),
        ('移民/居留規劃', '部分市場（土耳其、杜拜）提供公民計劃或長期居留簽證'),
    ]
    r_data = [[Paragraph('優勢', S['th']), Paragraph('說明', S['th'])]]
    for r in reasons:
        r_data.append([Paragraph(r[0], S['td']), Paragraph(r[1], S['tds'])])
    t = Table(r_data, colWidths=[100, 335])
    t.setStyle(table_style(NAVY))
    story.append(t)

    # 02
    story.append(Spacer(1, 14))
    story.append(Paragraph('02　六大市場快速比較', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    markets = [
        ['市場', '入場門檻', '租金報酬', '資本利得稅', '外資限制', '推薦程度'],
        ['🇹🇭 泰國', '台幣 200 萬起', '6–9%', '0%', '公寓 49%', '★★★★★'],
        ['🇲🇾 馬來西亞', '台幣 200 萬起', '4–6%', '依持有年限', 'MM2H 居留', '★★★★☆'],
        ['🇯🇵 日本', '台幣 300 萬起', '4–6%', '約 20%', '無限制', '★★★★☆'],
        ['🇦🇪 杜拜', '台幣 400 萬起', '6–9%', '0%', '100% 外資', '★★★★★'],
        ['🇹🇷 土耳其', '台幣 200 萬起', '5–8%', '低稅', '公民計劃', '★★★☆☆'],
        ['🇸🇬 新加坡', '台幣 1,500 萬起', '3–4%', '無', '印花稅高', '★★★☆☆'],
    ]
    m_data = []
    for i, row in enumerate(markets):
        if i == 0:
            m_data.append([Paragraph(x, S['th']) for x in row])
        else:
            m_data.append([Paragraph(x, S['td']) for x in row])
    t2 = Table(m_data, colWidths=[65, 80, 65, 75, 80, 70])
    t2.setStyle(table_style(NAVY))
    story.append(t2)
    story.append(PageBreak())

    # 03
    story.append(Paragraph('03　選市場的正確邏輯', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    logic_steps = [
        ('Step 1：確定投資目的', '現金流（租金）？資本增值？移民規劃？不同目的對應不同市場。'),
        ('Step 2：確認預算上限', '含買入稅費、持有成本、管理費，務必留 20% 緩衝。'),
        ('Step 3：評估管理可行性', '是否有當地信任的管理公司？語言與時差問題如何解決？'),
        ('Step 4：了解退場機制', '當地二手市場流動性如何？轉售稅費多少？'),
        ('Step 5：實地考察', '不要只看簡報，親赴現場確認環境、公設與周邊生活圈。'),
    ]
    for step, desc in logic_steps:
        story.append(Paragraph(f'<b>{step}</b>', S['h2']))
        story.append(Paragraph(desc, S['body']))

    # 04
    story.append(Paragraph('04　各市場外資購屋規定', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    regs = [
        ['市場', '外資可持有類型', '比例限制', '特殊規定'],
        ['泰國', '公寓（Condo）', '< 49%', 'FET 外匯憑證必備'],
        ['馬來西亞', '公寓、別墅、土地', '無上限', 'MM2H / 最低購屋門檻'],
        ['日本', '全部類型', '無限制', '固定資產稅 1.4%'],
        ['杜拜', 'Freehold 區全部', '100%', '4% DLD 轉讓費'],
        ['土耳其', '公寓、別墅', '無上限', '最低 40 萬美元可申請公民'],
        ['新加坡', '公寓（外籍）', '無上限', 'ABSD 外籍加稅 60%'],
    ]
    r_data2 = []
    for i, row in enumerate(regs):
        if i == 0:
            r_data2.append([Paragraph(x, S['th']) for x in row])
        else:
            r_data2.append([Paragraph(x, S['td']) for x in row])
    t3 = Table(r_data2, colWidths=[65, 100, 75, 195])
    t3.setStyle(table_style(colors.HexColor('#1e3a8a')))
    story.append(t3)
    story.append(PageBreak())

    # 05
    story.append(Paragraph('05　稅務架構與持有成本', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    tax_data = [
        ['費用項目', '泰國', '馬來西亞', '日本', '杜拜'],
        ['買入印花稅 / 登記費', '約 3.3%', '約 4%', '約 5–8%', '4% DLD'],
        ['年持有稅', '約 0.3%', '約 0.3%', '約 1.4%', '0%'],
        ['租金所得稅', '15%（代扣）', '25%', '約 20%', '0%'],
        ['資本利得稅', '0%', '依年限', '約 20%', '0%'],
        ['轉售仲介費', '約 3%', '約 3%', '約 3–5%', '約 2%'],
    ]
    t4_data = []
    for i, row in enumerate(tax_data):
        if i == 0:
            t4_data.append([Paragraph(x, S['th']) for x in row])
        else:
            t4_data.append([Paragraph(x, S['td']) for x in row])
    t4 = Table(t4_data, colWidths=[115, 80, 80, 80, 80])
    t4.setStyle(table_style(NAVY))
    story.append(t4)

    # 06
    story.append(Spacer(1, 14))
    story.append(Paragraph('06　台灣出發的資金匯款流程', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    flow_steps = [
        '1. 在台灣銀行申報「境外匯款」，填寫外匯申請書',
        '2. 資金匯至當地開發商指定帳戶（需為外幣帳戶）',
        '3. 收取 FET（Foreign Exchange Transaction）外匯交易憑證（泰國必備）',
        '4. 憑 FET 於土地局辦理產權登記',
        '5. 未來轉售或匯回台灣時，FET 為合法匯出資金的證明',
    ]
    for step in flow_steps:
        story.append(Paragraph(step, S['bullet']))

    story.append(Spacer(1, 10))
    story.append(Paragraph('⚠️  注意事項', S['h2']))
    story.append(Paragraph(
        '台灣每人每年境外匯款上限為 500 萬美元，超過需專案申報。'
        '建議在匯款前諮詢銀行理專或 TIREA 顧問，確認匯款路徑合規。', S['body']))
    story.append(PageBreak())

    # 07
    story.append(Paragraph('07　常見錯誤', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    errors = [
        ('只看報酬率，不看流動性', '空置率低不代表容易出售，二手市場深度同樣重要'),
        ('忽略持有成本', '管理費、稅費、空屋期加總後，實際報酬可能大幅縮水'),
        ('沒有實地考察', '照片與樣品屋可能美化現實，周邊環境需親眼確認'),
        ('選擇不合規的開發商', '務必確認開發商資質、EIA 環評通過、合法預售許可'),
        ('沒有設定退場策略', '進場前即應規劃 3–5 年後的出售或持續持有計劃'),
    ]
    err_data = [[Paragraph('常見錯誤', S['th']), Paragraph('正確做法', S['th'])]]
    for e in errors:
        err_data.append([Paragraph(e[0], S['td']), Paragraph(e[1], S['tds'])])
    t5 = Table(err_data, colWidths=[140, 295])
    t5.setStyle(table_style(colors.HexColor('#7f1d1d')))
    story.append(t5)

    # 08
    story.append(Spacer(1, 14))
    story.append(Paragraph('08　下一步：如何開始', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    nexts = [
        '加入 TIREA LINE 官方帳號 @180phkse，免費諮詢顧問',
        '填寫線上需求分析問卷，讓顧問了解您的投資目標',
        '參加說明會或考察團，親眼走進市場',
        '配合顧問進行一對一財務規劃與市場媒合',
    ]
    for n in nexts:
        story.append(Paragraph(f'→ {n}', S['bullet']))

    def on_first_page(canvas, doc):
        cover_page(canvas, doc, '海外置產入門完整指南',
                   '外資規定 · 稅務架構 · 匯款流程 · 選市場邏輯', 2,
                   '2026 年 4 月', colors.HexColor('#0ea5e9'))

    def on_later_pages(canvas, doc):
        add_footer(canvas, doc)

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(f'✅ Created: {path}')
    return path


# ══════════════════════════════════════════════════════════════════════════════
# REPORT 3: 杜拜 Freehold 市場概覽
# ══════════════════════════════════════════════════════════════════════════════
def build_dubai_report():
    path = os.path.join(OUT_DIR, 'tirea-dubai-freehold.pdf')
    S = make_styles()
    doc = SimpleDocTemplate(path, pagesize=A4,
        leftMargin=40, rightMargin=40, topMargin=50, bottomMargin=50)
    story = []

    story.append(Spacer(1, H - 120))
    story.append(PageBreak())

    # TOC
    story.append(Paragraph('目錄', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1, color=GOLD, spaceAfter=10))
    for num, title in [
        ('01', '杜拜市場 2026 核心優勢'),
        ('02', '稅務制度：0 稅負完整說明'),
        ('03', '外資 100% 持有規則'),
        ('04', 'Golden Visa 申請條件'),
        ('05', '熱門 Freehold 投資區域'),
        ('06', '買入費用結構'),
        ('07', '風險提示'),
    ]:
        story.append(Paragraph(f'<font color="#c89b3c"><b>{num}</b></font>　　{title}', S['body']))
        story.append(HRFlowable(width='100%', thickness=0.3, color=BORDER, spaceAfter=4))
    story.append(PageBreak())

    # 01
    story.append(Paragraph('01　杜拜市場 2026 核心優勢', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    kpi = [
        ['指標', '數值', '說明'],
        ['個人所得稅', '0%', '阿聯酋對個人完全免稅'],
        ['租金收益稅', '0%', '租金所得無需申報納稅'],
        ['資本利得稅', '0%', '出售房產獲利無稅'],
        ['外資持有比例', '100%', 'Freehold 區無限制'],
        ['平均租金報酬', '6 – 9%', 'Downtown / JVC / Marina'],
        ['房市年增幅', '+15%', '2023–2025 核心區均價'],
        ['Golden Visa 門檻', 'AED 200 萬', '約台幣 1,700 萬'],
        ['DLD 轉讓稅', '4%', '買方繳納，一次性'],
    ]
    kd = []
    for i, row in enumerate(kpi):
        if i == 0:
            kd.append([Paragraph(x, S['th']) for x in row])
        else:
            kd.append([Paragraph(x, S['td']) for x in row])
    t = Table(kd, colWidths=[130, 90, 215])
    t.setStyle(table_style(NAVY))
    story.append(t)

    # 02
    story.append(Spacer(1, 14))
    story.append(Paragraph('02　稅務制度：0 稅負完整說明', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        '阿聯酋（UAE）目前對個人不徵收任何所得稅、資本利得稅或租金收益稅。'
        '2023 年起阿聯酋雖實施企業稅（Corporate Tax 9%），但此稅種僅針對企業法人，'
        '個人持有不動產並收取租金不受影響。以下為稅務比較：', S['body']))

    tax = [
        ['稅種', '杜拜（UAE）', '台灣', '日本', '新加坡'],
        ['個人所得稅', '0%', '5–40%', '5–45%', '0–22%'],
        ['租金收益稅', '0%', '計入綜所稅', '約 20%', '計入所得稅'],
        ['資本利得稅', '0%', '房地合一稅', '約 20%', '0%'],
        ['年持有稅', '0%', '地價稅 + 房屋稅', '約 1.4%', '約 10%（物業稅）'],
        ['買入印花稅', '4% DLD', '契稅 + 仲介', '約 5–8%', 'ABSD 外籍 60%'],
    ]
    td = []
    for i, row in enumerate(tax):
        if i == 0:
            td.append([Paragraph(x, S['th']) for x in row])
        else:
            td.append([Paragraph(x, S['td']) for x in row])
    t2 = Table(td, colWidths=[90, 75, 75, 70, 75])
    t2.setStyle(table_style(NAVY))
    story.append(t2)
    story.append(PageBreak())

    # 03
    story.append(Paragraph('03　外資 100% 持有規則', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    story.append(Paragraph(
        '杜拜政府於 2002 年正式開放指定 Freehold 區域供外籍人士 100% 持有產權，'
        '並頒發由杜拜土地局（DLD, Dubai Land Department）背書的 Title Deed 產權憑證。', S['body']))
    rules = [
        '✓ Freehold 區：外籍人士可永久持有產權（Freehold Title Deed）',
        '✓ 主要 Freehold 區域：Downtown Dubai、Dubai Marina、JVC、Business Bay、Palm Jumeirah',
        '✓ 產權登記機關：Dubai Land Department（DLD）',
        '✓ 外籍持有無比例限制（不同於泰國 49% 上限）',
        '✓ 可透過個人名義或境外公司持有',
        '✓ 轉售、繼承均合法，無外資轉讓限制',
    ]
    for r in rules:
        story.append(Paragraph(r, S['bullet']))

    # 04
    story.append(Spacer(1, 14))
    story.append(Paragraph('04　Golden Visa 申請條件', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    visa_data = [
        ['類型', '條件', '有效期', '備註'],
        ['不動產投資 Golden Visa', '購買 AED 200 萬（約台幣 1,700 萬）以上不動產', '10 年（可續簽）', '可攜帶配偶及子女'],
        ['企業家 Golden Visa', '設立年營收 AED 100 萬以上企業', '10 年', '需提交審計報告'],
        ['專業人才 Golden Visa', '特定高需求行業（醫生、工程師等）', '10 年', '需雇主擔保'],
    ]
    vd = []
    for i, row in enumerate(visa_data):
        if i == 0:
            vd.append([Paragraph(x, S['th']) for x in row])
        else:
            vd.append([Paragraph(x, S['td']) for x in row])
    t3 = Table(vd, colWidths=[90, 170, 70, 105])
    t3.setStyle(table_style(colors.HexColor('#065f46')))
    story.append(t3)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        '💡 持有 AED 200 萬以上不動產即可申請 10 年 Golden Visa，全家同享居留權，'
        '是目前全球投資移民方案中條件最優惠的選項之一。', S['body']))
    story.append(PageBreak())

    # 05
    story.append(Paragraph('05　熱門 Freehold 投資區域', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    areas = [
        ['區域', '特色', '參考入場價（台幣）', '預估租報'],
        ['Downtown Dubai', 'Burj Khalifa 旁，全球地標，豪宅市場', '1,200 萬 – 5,000 萬', '5 – 7%'],
        ['Dubai Marina', '海景公寓，外籍社群密集，租需旺盛', '600 萬 – 2,000 萬', '6 – 8%'],
        ['Jumeirah Village Circle (JVC)', '新興住宅區，性價比最高，捷運規劃中', '350 萬 – 800 萬', '7 – 9%'],
        ['Business Bay', '商辦與住宅混合，新興 CBD，年輕客群', '700 萬 – 2,500 萬', '6 – 8%'],
        ['Palm Jumeirah', '人工島，全球知名豪宅，Villa 市場', '3,000 萬以上', '4 – 6%'],
    ]
    ad = []
    for i, row in enumerate(areas):
        if i == 0:
            ad.append([Paragraph(x, S['th']) for x in row])
        else:
            ad.append([Paragraph(x, S['td']) for x in row])
    t4 = Table(ad, colWidths=[90, 150, 110, 85])
    t4.setStyle(table_style(NAVY))
    story.append(t4)

    # 06
    story.append(Spacer(1, 14))
    story.append(Paragraph('06　買入費用結構', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    costs = [
        ['費用項目', '比率 / 金額', '備註'],
        ['DLD 轉讓稅', '4%', '向杜拜土地局繳納，買方負擔'],
        ['DLD 行政費', 'AED 4,000', '約台幣 3.4 萬，固定費用'],
        ['仲介費', '約 2%', '通常由買方支付'],
        ['律師費', 'AED 6,000 – 15,000', '合約審閱與登記協助'],
        ['合計（估算）', '約 6 – 7%', '以總房價計算'],
    ]
    cd = []
    for i, row in enumerate(costs):
        if i == 0:
            cd.append([Paragraph(x, S['th']) for x in row])
        else:
            cd.append([Paragraph(x, S['td']) for x in row])
    t5 = Table(cd, colWidths=[130, 110, 195])
    t5.setStyle(table_style(NAVY))
    story.append(t5)

    # 07
    story.append(Spacer(1, 14))
    story.append(Paragraph('07　風險提示', S['h1']))
    story.append(HRFlowable(width='100%', thickness=1.5, color=GOLD, spaceAfter=8))
    risks = [
        ('供給過剩風險', '杜拜持續有大量新案推出，部分區域供給壓力較大'),
        ('匯率風險', 'AED 與美元掛鉤（固定 1 USD = 3.67 AED），但台幣有波動風險'),
        ('期房延遲', '期房交屋延遲在杜拜較常見，建議選擇有交屋記錄的開發商'),
        ('地政法規變化', '雖然目前外資友善，但政策可能調整，需持續追蹤'),
    ]
    rd = [[Paragraph('風險類型', S['th']), Paragraph('說明', S['th'])]]
    for r in risks:
        rd.append([Paragraph(r[0], S['td']), Paragraph(r[1], S['tds'])])
    t6 = Table(rd, colWidths=[100, 335])
    t6.setStyle(table_style(colors.HexColor('#7f1d1d')))
    story.append(t6)

    def on_first_page(canvas, doc):
        cover_page(canvas, doc, '杜拜 Freehold 市場概覽',
                   '0稅負 · 外資 100% 持有 · Golden Visa 申請條件', 3,
                   '2026 年 4 月', EMERALD)

    def on_later_pages(canvas, doc):
        add_footer(canvas, doc)

    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_later_pages)
    print(f'✅ Created: {path}')
    return path


if __name__ == '__main__':
    print('生成 TIREA 三份報告...')
    p1 = build_bangkok_report()
    p2 = build_guide_report()
    p3 = build_dubai_report()
    print(f'\n全部完成！')
    print(f'  {p1}')
    print(f'  {p2}')
    print(f'  {p3}')
