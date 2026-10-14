import os, sys, io, re, zipfile
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
from parse_arsc import ARSCParser
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, transparent
import pypdfium2

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

def render_vector_xml(xml_content, target_path, override_color=None, target_size=96):
    # Extract viewport
    vw_m = re.search(r'viewportWidth="([^"]+)"', xml_content)
    vh_m = re.search(r'viewportHeight="([^"]+)"', xml_content)
    
    # Sometimes viewport is a float packed as integer in arsc or float string
    def parse_dim(val):
        try:
            v = float(val)
            # If huge integer like 1103101952, it is IEEE float bits!
            if v > 1000000:
                import struct
                packed = struct.pack('>I', int(v))
                return struct.unpack('>f', packed)[0]
            return v
        except:
            return 24.0

    vw = parse_dim(vw_m.group(1)) if vw_m else 24.0
    vh = parse_dim(vh_m.group(1)) if vh_m else 24.0
    if vw <= 0: vw = 24.0
    if vh <= 0: vh = 24.0
    
    scale = target_size / max(vw, vh)
    def tx(x): return x * scale
    def ty(y): return target_size - (y * scale)
    
    pdf_io = io.BytesIO()
    c = canvas.Canvas(pdf_io, pagesize=(target_size, target_size))
    
    # Parse all path tags
    paths = re.findall(r'<path\b([^>]*)/?>', xml_content)
    for p_attr in paths:
        d_m = re.search(r'pathData="([^"]+)"', p_attr)
        if not d_m: continue
        path_data = d_m.group(1)
        
        # Color parsing
        fill_color = None
        fill_m = re.search(r'fillColor="([^"]+)"', p_attr)
        if fill_m:
            f_val = fill_m.group(1)
            if override_color:
                if f_val != "0" and f_val != "@android:color/transparent":
                    fill_color = HexColor(override_color)
            else:
                if f_val.startswith('#'):
                    fill_color = HexColor(f_val[:7])
                elif f_val.isdigit() or (f_val.startswith('-') and f_val[1:].isdigit()):
                    int_val = int(f_val)
                    hex_str = f"#{int_val & 0xFFFFFF:06X}"
                    fill_color = HexColor(hex_str)
                    
        stroke_color = None
        stroke_m = re.search(r'strokeColor="([^"]+)"', p_attr)
        if stroke_m:
            s_val = stroke_m.group(1)
            if override_color:
                stroke_color = HexColor(override_color)
            else:
                if s_val.startswith('#'):
                    stroke_color = HexColor(s_val[:7])
                elif s_val.isdigit() or (s_val.startswith('-') and s_val[1:].isdigit()):
                    int_val = int(s_val)
                    stroke_color = HexColor(f"#{int_val & 0xFFFFFF:06X}")

        sw_m = re.search(r'strokeWidth="([^"]+)"', p_attr)
        stroke_width = parse_dim(sw_m.group(1)) if sw_m else 1.5
        if stroke_width > 50: stroke_width = 1.5
        
        # If neither fill nor stroke is defined, default fill to override_color or #B81414
        if fill_color is None and stroke_color is None:
            fill_color = HexColor(override_color if override_color else '#B81414')
            
        # Draw path
        commands = parse_svg_path(path_data)
        p = c.beginPath()
        cur_x, cur_y = 0.0, 0.0
        start_x, start_y = 0.0, 0.0
        last_cx, last_cy = 0.0, 0.0
        has_path = False
        
        for cmd, args in commands:
            if cmd == 'M':
                cur_x, cur_y = args[0], args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
                has_path = True
                for j in range(2, len(args), 2):
                    cur_x, cur_y = args[j], args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'm':
                cur_x += args[0]
                cur_y += args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
                has_path = True
                for j in range(2, len(args), 2):
                    cur_x += args[j]
                    cur_y += args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'L':
                for j in range(0, len(args), 2):
                    cur_x, cur_y = args[j], args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == 'l':
                for j in range(0, len(args), 2):
                    cur_x += args[j]
                    cur_y += args[j+1]
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
            elif cmd == 'S':
                for j in range(0, len(args), 4):
                    x1 = 2 * cur_x - last_cx
                    y1 = 2 * cur_y - last_cy
                    x2, y2 = args[j], args[j+1]
                    cur_x, cur_y = args[j+2], args[j+3]
                    last_cx, last_cy = x2, y2
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd == 's':
                for j in range(0, len(args), 4):
                    x1 = 2 * cur_x - last_cx
                    y1 = 2 * cur_y - last_cy
                    x2, y2 = cur_x + args[j], cur_y + args[j+1]
                    cur_x, cur_y = cur_x + args[j+2], cur_y + args[j+3]
                    last_cx, last_cy = x2, y2
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd in ['Z', 'z']:
                p.close()
                cur_x, cur_y = start_x, start_y
                
        if has_path:
            do_fill = fill_color is not None
            do_stroke = stroke_color is not None
            if do_fill: c.setFillColor(fill_color)
            if do_stroke:
                c.setStrokeColor(stroke_color)
                c.setLineWidth(stroke_width * scale)
            c.drawPath(p, fill=1 if do_fill else 0, stroke=1 if do_stroke else 0)

    c.save()
    pdf_bytes = pdf_io.getvalue()
    pdf = pypdfium2.PdfDocument(pdf_bytes)
    page = pdf[0]
    bitmap = page.render(scale=2)
    img = bitmap.to_pil()
    img.save(target_path)
    print(f"Rendered: {target_path} (size {img.size})")

# Render 5 bottom navigation tabs (normal = #757575, active = #B81414)
tabs = [
    ("res/drawable/ic_menu_home.xml", "assets/nav/nav_home.png", "assets/nav/nav_home_active.png"),
    ("res/drawable/ic_cash_box_new.xml", "assets/nav/nav_cashbox.png", "assets/nav/nav_cashbox_active.png"),
    ("res/drawable/ic_bulk_tagada_new.xml", "assets/nav/nav_tagada.png", "assets/nav/nav_tagada_active.png"),
    ("res/drawable/ic_tp_wallet.xml", "assets/nav/nav_tallypay.png", "assets/nav/nav_tallypay_active.png"),
    ("res/drawable/ic_menu_horizontal_lines_v2.xml", "assets/nav/nav_menu.png", "assets/nav/nav_menu_active.png"),
]

for xml_name, norm_path, act_path in tabs:
    if xml_name in z.namelist():
        raw = decode_axml(z.read(xml_name))
        render_vector_xml(raw, norm_path, override_color="#757575")
        render_vector_xml(raw, act_path, override_color="#B81414")

# Toolbar icons
tb_icons = [
    ("res/drawable/ic_support.xml", "assets/icons/ic_support.png", "#B81414"),
    ("res/drawable/ic_notification.xml", "assets/icons/ic_notification.png", "#B81414"),
    ("res/drawable/ic_inbox.xml", "assets/icons/ic_inbox.png", "#B81414"),
    ("res/drawable/ic_filter.xml", "assets/icons/ic_filter.png", "#4D4D4D"),
    ("res/drawable/ic_share.xml", "assets/icons/ic_share.png", "#B81414"),
    ("res/drawable/ic_call.xml", "assets/icons/ic_call.png", "#0F8A0F"),
    ("res/drawable/ic_sms.xml", "assets/icons/ic_sms.png", "#1976D2"),
    ("res/drawable/ic_whats_app.xml", "assets/icons/ic_whatsapp.png", "#25D366"),
    ("res/drawable/ic_delete_bin.xml", "assets/icons/ic_delete.png", "#D32F2F"),
    ("res/drawable/ic_edit.xml", "assets/icons/ic_edit.png", "#1976D2"),
]

for xml_name, icon_path, col in tb_icons:
    # Try finding in APK
    found = None
    if xml_name in z.namelist():
        found = xml_name
    else:
        # Search for similar
        base = xml_name.split('/')[-1].replace('.xml', '')
        for n in z.namelist():
            if n.startswith("res/drawable") and n.endswith(".xml") and base in n:
                found = n
                break
    if found:
        print(f"Rendering {found} -> {icon_path}")
        raw = decode_axml(z.read(found))
        render_vector_xml(raw, icon_path, override_color=col)
    else:
        print(f"Not found in APK: {xml_name}")
