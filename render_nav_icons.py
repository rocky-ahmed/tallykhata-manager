import zipfile, re, sys, io
sys.stdout.reconfigure(encoding="utf-8")
from decode_axml import decode_axml
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import pypdfium2

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk_path)

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
    vw_m = re.search(r'viewportWidth="([^"]+)"', xml_content)
    vh_m = re.search(r'viewportHeight="([^"]+)"', xml_content)
    
    def parse_dim(val):
        try:
            v = float(val)
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
    
    paths = re.findall(r'<path\b([^>]*)/?>', xml_content)
    for p_attr in paths:
        d_m = re.search(r'pathData="([^"]+)"', p_attr)
        if not d_m: continue
        path_data = d_m.group(1)
        
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
                    if int_val != 0:
                        fill_color = HexColor(f"#{int_val & 0xFFFFFF:06X}")
                    
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
        
        if fill_color is None and stroke_color is None:
            if override_color:
                fill_color = HexColor(override_color)
            else:
                fill_color = HexColor('#B81414')
            
        commands = parse_svg_path(path_data)
        p = c.beginPath()
        cur_x, cur_y = 0, 0
        start_x, start_y = 0, 0
        last_cx, last_cy = 0, 0
        has_path = False
        for cmd, args in commands:
            has_path = True
            if cmd == 'M':
                cur_x, cur_y = args[0], args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
            elif cmd == 'm':
                cur_x += args[0]
                cur_y += args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
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

# Render authentic bottom navigation icons from demo APK
targets = [
    ("res/drawable/ic_nav_tally_selected.xml", "assets/nav/nav_home_active.png", "#B81414"),
    ("res/drawable/ic_nav_tally_un_selected.xml", "assets/nav/nav_home.png", "#6B7280"),
    ("res/drawable/ic_nav_cash_box_selected.xml", "assets/nav/nav_cashbox_active.png", "#B81414"),
    ("res/drawable/ic_nav_cash_box_un_selected.xml", "assets/nav/nav_cashbox.png", "#6B7280"),
    ("res/drawable/ic_nav_wallet_selected.xml", "assets/nav/nav_tallypay_active.png", "#B81414"),
    ("res/drawable/ic_nav_wallet_un_selected.xml", "assets/nav/nav_tallypay.png", "#6B7280"),
]

for xml_file, out_path, col in targets:
    raw = decode_axml(z.read(xml_file))
    render_vector_xml(raw, out_path, override_color=col)
