import io, os, re, sys, zipfile, struct
import pypdfium2
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from decode_axml import decode_axml
from parse_arsc import ARSCParser

sys.stdout.reconfigure(encoding="utf-8")
os.makedirs("assets/nav", exist_ok=True)
os.makedirs("assets/icons", exist_ok=True)

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk_path)
arsc = ARSCParser(z.read("resources.arsc"))

def parse_svg_path(path_str):
    tokens = re.findall(r'([a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)', path_str)
    commands = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token.isalpha():
            cmd = token
            i += 1
            args = []
            while i < len(tokens) and not tokens[i].isalpha():
                args.append(float(tokens[i]))
                i += 1
            commands.append((cmd, args))
        else:
            i += 1
    return commands

def parse_dim(val):
    try:
        v = float(val)
        if v > 1000000:
            packed = struct.pack('>I', int(v))
            return struct.unpack('>f', packed)[0]
        return v
    except:
        return 24.0

def render_vector(xml_content, target_path, override_color=None, target_size=96, stroke_width_override=None):
    vw_m = re.search(r'viewportWidth="([^"]+)"', xml_content)
    vh_m = re.search(r'viewportHeight="([^"]+)"', xml_content)
    vw = parse_dim(vw_m.group(1)) if vw_m else 24.0
    vh = parse_dim(vh_m.group(1)) if vh_m else 24.0
    if vw <= 0: vw = 24.0
    if vh <= 0: vh = 24.0

    scale = target_size / max(vw, vh)
    def tx(x): return x * scale
    def ty(y): return target_size - (y * scale)

    pdf_io = io.BytesIO()
    c = canvas.Canvas(pdf_io, pagesize=(target_size, target_size))

    paths = re.findall(r'<path\b([^>]*)/?>', xml_content)
    for p_attr in paths:
        d_m = re.search(r'pathData="([^"]+)"', p_attr)
        if not d_m: continue
        path_data = d_m.group(1).strip()

        # Ignore full-bleed canvas rectangle
        if re.match(r'^M\s*0\s*,\s*0\s*h\s*\d+\s*v\s*\d+\s*h\s*-\d+\s*z$', path_data, re.I):
            continue

        fill_m = re.search(r'fillColor="([^"]+)"', p_attr)
        stroke_m = re.search(r'strokeColor="([^"]+)"', p_attr)
        sw_m = re.search(r'strokeWidth="([^"]+)"', p_attr)

        fill_val = fill_m.group(1) if fill_m else None
        stroke_val = stroke_m.group(1) if stroke_m else None
        sw_val = parse_dim(sw_m.group(1)) if sw_m else 1.5

        fill_color = None
        if fill_val is not None and fill_val != "0" and fill_val != "@android:color/transparent":
            if override_color:
                fill_color = HexColor(override_color)
            elif fill_val.startswith("#"):
                fill_color = HexColor(fill_val[:7])
            elif fill_val.isdigit() or (fill_val.startswith("-") and fill_val[1:].isdigit()):
                int_col = int(fill_val)
                if int_col == -1:
                    fill_color = HexColor("#FFFFFF")
                else:
                    fill_color = HexColor(f"#{int_col & 0xFFFFFF:06X}")

        stroke_color = None
        if stroke_val is not None and stroke_val != "0" and stroke_val != "@android:color/transparent":
            if override_color:
                stroke_color = HexColor(override_color)
            elif stroke_val.startswith("#"):
                stroke_color = HexColor(stroke_val[:7])
            elif stroke_val.isdigit() or (stroke_val.startswith("-") and stroke_val[1:].isdigit()):
                int_col = int(stroke_val)
                stroke_color = HexColor(f"#{int_col & 0xFFFFFF:06X}")

        if fill_color is None and stroke_color is None:
            fill_color = HexColor(override_color if override_color else "#4D4D4D")

        commands = parse_svg_path(path_data)
        p = c.beginPath()
        cur_x, cur_y = 0.0, 0.0
        start_x, start_y = 0.0, 0.0
        last_cx, last_cy = 0.0, 0.0
        has_points = False

        for cmd, args in commands:
            has_points = True
            if cmd == 'M':
                cur_x, cur_y = args[0], args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
                for j in range(2, len(args), 2):
                    cur_x, cur_y = args[j], args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'm':
                cur_x += args[0]; cur_y += args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
                for j in range(2, len(args), 2):
                    cur_x += args[j]; cur_y += args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'L':
                for j in range(0, len(args), 2):
                    cur_x, cur_y = args[j], args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'l':
                for j in range(0, len(args), 2):
                    cur_x += args[j]; cur_y += args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'H':
                for x in args:
                    cur_x = x
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'h':
                for dx in args:
                    cur_x += dx
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'V':
                for y in args:
                    cur_y = y
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'v':
                for dy in args:
                    cur_y += dy
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'C':
                for j in range(0, len(args), 6):
                    x1, y1 = args[j], args[j+1]
                    x2, y2 = args[j+2], args[j+3]
                    cur_x, cur_y = args[j+4], args[j+5]
                    last_cx, last_cy = x2, y2
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd == 'c':
                for j in range(0, len(args), 6):
                    x1, y1 = cur_x + args[j], cur_y + args[j+1]
                    x2, y2 = cur_x + args[j+2], cur_y + args[j+3]
                    cur_x, cur_y = cur_x + args[j+4], cur_y + args[j+5]
                    last_cx, last_cy = x2, y2
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd in ['Z', 'z']:
                p.close()
                cur_x, cur_y = start_x, start_y

        if has_points:
            do_fill = fill_color is not None
            do_stroke = stroke_color is not None
            if do_fill: c.setFillColor(fill_color)
            if do_stroke:
                c.setStrokeColor(stroke_color)
                w = stroke_width_override if stroke_width_override else sw_val
                c.setLineWidth(w * scale)
            c.drawPath(p, fill=1 if do_fill else 0, stroke=1 if do_stroke else 0)

    c.save()
    pdf_bytes = pdf_io.getvalue()
    pdf = pypdfium2.PdfDocument(pdf_bytes)
    page = pdf[0]
    bitmap = page.render(scale=2, fill_color=(0, 0, 0, 0))
    img = bitmap.to_pil()
    img.save(target_path)
    print(f"Rendered: {target_path} (mode {img.mode})")

# 1. BOTTOM NAVIGATION TABS
render_vector(decode_axml(z.read("res/drawable/ic_nav_tally_un_selected.xml")), "assets/nav/nav_home.png", override_color="#757575")
render_vector(decode_axml(z.read("res/drawable/ic_nav_tally_selected.xml")), "assets/nav/nav_home_active.png", override_color="#B81414")

render_vector(decode_axml(z.read("res/drawable/ic_nav_cash_box_un_selected.xml")), "assets/nav/nav_cashbox.png", override_color="#757575")
render_vector(decode_axml(z.read("res/drawable/ic_nav_cash_box_selected.xml")), "assets/nav/nav_cashbox_active.png", override_color="#B81414")

render_vector(decode_axml(z.read("res/drawable/ic_bulk_tagada_new.xml")), "assets/nav/nav_tagada.png", override_color="#757575")
render_vector(decode_axml(z.read("res/drawable/ic_bulk_tagada_new.xml")), "assets/nav/nav_tagada_active.png", override_color="#B81414")

render_vector(decode_axml(z.read("res/drawable/ic_nav_wallet_un_selected.xml")), "assets/nav/nav_tallypay.png", override_color="#757575")
render_vector(decode_axml(z.read("res/drawable/ic_nav_wallet_selected.xml")), "assets/nav/nav_tallypay_active.png", override_color="#B81414")

hamburger_xml = """<vector height="24" width="24" viewportWidth="24" viewportHeight="24">
  <path fillColor="#757575" pathData="M3,6h18v2H3V6zm0,5h18v2H3v-2zm0,5h18v2H3v-2z" />
</vector>"""
render_vector(hamburger_xml, "assets/nav/nav_menu.png")
hamburger_active_xml = """<vector height="24" width="24" viewportWidth="24" viewportHeight="24">
  <path fillColor="#B81414" pathData="M3,6h18v2H3V6zm0,5h18v2H3v-2zm0,5h18v2H3v-2z" />
</vector>"""
render_vector(hamburger_active_xml, "assets/nav/nav_menu_active.png")

# 2. HEADER AND SEARCH ICONS
render_vector(decode_axml(z.read("res/drawable/solar_crown.xml")), "assets/icons/ic_crown.png", override_color="#F59E0B")
render_vector(decode_axml(z.read("res/drawable/ic_arrow_down.xml")), "assets/icons/ic_arrow_down.png", override_color="#1A1A1A")
render_vector(decode_axml(z.read("res/drawable/ic_search.xml")), "assets/icons/ic_search.png", override_color="#757575")
render_vector(decode_axml(z.read("res/drawable/ic_filter.xml")), "assets/icons/ic_filter.png", override_color="#4D4D4D")
render_vector(decode_axml(z.read("res/drawable/ic_download.xml")), "assets/icons/ic_download.png", override_color="#4D4D4D")
render_vector(decode_axml(z.read("res/drawable/ic_add_user.xml")), "assets/icons/ic_add_user.png", override_color="#FFFFFF")
render_vector(decode_axml(z.read("res/drawable/ic_close_black.xml")), "assets/icons/ic_close.png", override_color="#4D4D4D")
render_vector(decode_axml(z.read("res/drawable/ic_support.xml")), "assets/icons/ic_support.png", override_color="#B81414")
render_vector(decode_axml(z.read("res/drawable/ic_message_close.xml")), "assets/icons/ic_inbox.png", override_color="#B81414")
render_vector(decode_axml(z.read("res/drawable/backup_done.xml")), "assets/icons/ic_cloud.png", override_color="#0F8A0F")
render_vector(decode_axml(z.read("res/drawable/arrow_left.xml")), "assets/icons/arrow_left.png", override_color="#1A1A1A")
render_vector(decode_axml(z.read("res/drawable/ic_call.xml")), "assets/icons/ic_call.png", override_color="#0F8A0F")
render_vector(decode_axml(z.read("res/drawable/ic_delete.xml")), "assets/icons/ic_delete.png", override_color="#B81414")
render_vector(decode_axml(z.read("res/drawable/ic_pdf.xml")), "assets/icons/ic_pdf.png", override_color="#B81414")
render_vector(decode_axml(z.read("res/drawable/ic_sms.xml")), "assets/icons/ic_sms.png", override_color="#B81414")
render_vector(decode_axml(z.read("res/drawable/ic_share_tagada.xml")), "assets/icons/ic_share.png", override_color="#1A1A1A")

print("SUCCESS: All icons rendered to transparent RGBA PNGs!")
