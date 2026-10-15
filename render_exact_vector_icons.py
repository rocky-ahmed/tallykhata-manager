import zipfile, io, re, struct, math, os
from PIL import Image
import pypdfium2
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from decode_axml import decode_axml

apk_path = r"D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk"
z = zipfile.ZipFile(apk_path)

def int_to_hex(val):
    if val < 0: val = val + (1 << 32)
    return "#{:06X}".format(val & 0xFFFFFF)

def parse_f(val):
    try:
        v = float(val)
        if v > 1000000:
            return struct.unpack("!f", struct.pack("!I", int(v)))[0]
        return v
    except:
        return 0.0

def arc_to_beziers(x1, y1, rx, ry, phi, fA, fS, x2, y2):
    if x1 == x2 and y1 == y2: return []
    if rx == 0 or ry == 0: return [("L", (x2, y2))]
    rx, ry = abs(rx), abs(ry)
    phi_rad = math.radians(phi)
    cos_phi, sin_phi = math.cos(phi_rad), math.sin(phi_rad)
    dx = (x1 - x2) / 2.0
    dy = (y1 - y2) / 2.0
    x1p = cos_phi * dx + sin_phi * dy
    y1p = -sin_phi * dx + cos_phi * dy
    prx, pry = rx * rx, ry * ry
    px1p, py1p = x1p * x1p, y1p * y1p
    check = px1p / prx + py1p / pry
    if check > 1:
        scale = math.sqrt(check)
        rx *= scale
        ry *= scale
        prx, pry = rx * rx, ry * ry
    sign = -1.0 if fA == fS else 1.0
    sq = (prx * pry - prx * py1p - pry * px1p) / (prx * py1p + pry * px1p)
    sq = max(0.0, sq)
    coef = sign * math.sqrt(sq)
    cxp = coef * ((rx * y1p) / ry)
    cyp = coef * (-(ry * x1p) / rx)
    cx = cos_phi * cxp - sin_phi * cyp + (x1 + x2) / 2.0
    cy = sin_phi * cxp + cos_phi * cyp + (y1 + y2) / 2.0
    def angle(u, v):
        dot = u[0]*v[0] + u[1]*v[1]
        mag = math.sqrt(u[0]**2 + u[1]**2) * math.sqrt(v[0]**2 + v[1]**2)
        val = max(-1.0, min(1.0, dot / (mag if mag != 0 else 1.0)))
        ang = math.acos(val)
        if (u[0]*v[1] - u[1]*v[0]) < 0: ang = -ang
        return ang
    vx1 = (x1p - cxp) / rx
    vy1 = (y1p - cyp) / ry
    theta1 = angle((1, 0), (vx1, vy1))
    dtheta = angle((vx1, vy1), ((-x1p - cxp) / rx, (-y1p - cyp) / ry))
    if not fS and dtheta > 0: dtheta -= 2.0 * math.pi
    elif fS and dtheta < 0: dtheta += 2.0 * math.pi
    segments = max(1, int(math.ceil(abs(dtheta) / (math.pi / 2.0))))
    delta = dtheta / segments
    t = 8.0 / 3.0 * math.sin(delta / 4.0) * math.sin(delta / 4.0) / math.sin(delta / 2.0)
    beziers = []
    th = theta1
    for _ in range(segments):
        cos_th, sin_th = math.cos(th), math.sin(th)
        cos_th2, sin_th2 = math.cos(th + delta), math.sin(th + delta)
        e1x = cos_phi * rx * cos_th - sin_phi * ry * sin_th + cx
        e1y = sin_phi * rx * cos_th + cos_phi * ry * sin_th + cy
        e2x = cos_phi * rx * cos_th2 - sin_phi * ry * sin_th2 + cx
        e2y = sin_phi * rx * cos_th2 + cos_phi * ry * sin_th2 + cy
        d1x = -cos_phi * rx * sin_th - sin_phi * ry * cos_th
        d1y = -sin_phi * rx * sin_th + cos_phi * ry * sin_th
        d2x = -cos_phi * rx * sin_th2 - sin_phi * ry * cos_th2
        d2y = -sin_phi * rx * sin_th2 + cos_phi * ry * cos_th2
        cp1x = e1x + t * d1x
        cp1y = e1y + t * d1y
        cp2x = e2x - t * d2x
        cp2y = e2y - t * d2y
        beziers.append((cp1x, cp1y, cp2x, cp2y, e2x, e2y))
        th += delta
    return beziers

def parse_svg_path(path_str):
    tokens = re.findall(r"([a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)", path_str)
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

def render_vector_file(xml_data, out_path, bg_color=None, stroke_override=None, fill_override=None, size=144):
    xml_str = decode_axml(xml_data)
    vw_m = re.search(r'viewportWidth="([^"]+)"', xml_str)
    vh_m = re.search(r'viewportHeight="([^"]+)"', xml_str)
    vw = parse_f(vw_m.group(1)) if vw_m else 24.0
    vh = parse_f(vh_m.group(1)) if vh_m else 24.0
    if vw <= 0: vw = 24.0
    if vh <= 0: vh = 24.0

    scale = size / max(vw, vh)
    def tx(x): return x * scale
    def ty(y): return size - (y * scale)

    pdf_io = io.BytesIO()
    c = canvas.Canvas(pdf_io, pagesize=(size, size))

    paths = re.findall(r'<path\b([^>]*)/?>', xml_str)
    for p_attr in paths:
        d_m = re.search(r'pathData="([^"]+)"', p_attr)
        if not d_m: continue
        path_data = d_m.group(1)

        fill_m = re.search(r'fillColor="([^"]+)"', p_attr)
        stroke_m = re.search(r'strokeColor="([^"]+)"', p_attr)
        sw_m = re.search(r'strokeWidth="([^"]+)"', p_attr)
        cap_m = re.search(r'strokeLineCap="([^"]+)"', p_attr)
        join_m = re.search(r'strokeLineJoin="([^"]+)"', p_attr)

        fill_val = fill_m.group(1) if fill_m else None
        stroke_val = stroke_m.group(1) if stroke_m else None
        sw_val = parse_f(sw_m.group(1)) if sw_m else 1.2
        if sw_val <= 0: sw_val = 1.2

        fill_c = None
        stroke_c = None

        if fill_override:
            fill_c = HexColor(fill_override)
        elif fill_val and fill_val != "0" and fill_val != "@android:color/transparent":
            if fill_val.startswith("#"):
                fill_c = HexColor(fill_val[:7])
            elif fill_val.isdigit() or (fill_val.startswith("-") and fill_val[1:].isdigit()):
                int_v = int(fill_val)
                if int_v > 2000000000:
                    fill_c = HexColor(bg_color) if bg_color else HexColor("#FDE8E8")
                else:
                    fill_c = HexColor(int_to_hex(int_v))

        if stroke_override:
            stroke_c = HexColor(stroke_override)
        elif stroke_val and stroke_val != "0":
            if stroke_val.startswith("#"):
                stroke_c = HexColor(stroke_val[:7])
            elif stroke_val.isdigit() or (stroke_val.startswith("-") and stroke_val[1:].isdigit()):
                stroke_c = HexColor(int_to_hex(int(stroke_val)))

        cmds = parse_svg_path(path_data)
        p = c.beginPath()
        cur_x, cur_y = 0.0, 0.0
        start_x, start_y = 0.0, 0.0
        has_points = False

        for cmd, args in cmds:
            if cmd == "M":
                cur_x, cur_y = args[0], args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
                has_points = True
                for j in range(2, len(args), 2):
                    cur_x, cur_y = args[j], args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == "m":
                cur_x += args[0]
                cur_y += args[1]
                start_x, start_y = cur_x, cur_y
                p.moveTo(tx(cur_x), ty(cur_y))
                has_points = True
                for j in range(2, len(args), 2):
                    cur_x += args[j]
                    cur_y += args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == "L":
                for j in range(0, len(args), 2):
                    cur_x, cur_y = args[j], args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == "l":
                for j in range(0, len(args), 2):
                    cur_x += args[j]
                    cur_y += args[j+1]
                    p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == "H":
                cur_x = args[0]
                p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == "h":
                cur_x += args[0]
                p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == "V":
                cur_y = args[0]
                p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == "v":
                cur_y += args[0]
                p.lineTo(tx(cur_x), ty(cur_y))
            elif cmd == "C":
                for j in range(0, len(args), 6):
                    x1, y1 = args[j], args[j+1]
                    x2, y2 = args[j+2], args[j+3]
                    cur_x, cur_y = args[j+4], args[j+5]
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd == "c":
                for j in range(0, len(args), 6):
                    x1, y1 = cur_x + args[j], cur_y + args[j+1]
                    x2, y2 = cur_x + args[j+2], cur_y + args[j+3]
                    cur_x, cur_y = cur_x + args[j+4], cur_y + args[j+5]
                    p.curveTo(tx(x1), ty(y1), tx(x2), ty(y2), tx(cur_x), ty(cur_y))
            elif cmd == "A":
                for j in range(0, len(args), 7):
                    rx, ry, phi, fA, fS, x2, y2 = args[j:j+7]
                    beziers = arc_to_beziers(cur_x, cur_y, rx, ry, phi, fA, fS, x2, y2)
                    for b in beziers:
                        p.curveTo(tx(b[0]), ty(b[1]), tx(b[2]), ty(b[3]), tx(b[4]), ty(b[5]))
                    cur_x, cur_y = x2, y2
            elif cmd == "a":
                for j in range(0, len(args), 7):
                    rx, ry, phi, fA, fS, dx, dy = args[j:j+7]
                    x2, y2 = cur_x + dx, cur_y + dy
                    beziers = arc_to_beziers(cur_x, cur_y, rx, ry, phi, fA, fS, x2, y2)
                    for b in beziers:
                        p.curveTo(tx(b[0]), ty(b[1]), tx(b[2]), ty(b[3]), tx(b[4]), ty(b[5]))
                    cur_x, cur_y = x2, y2
            elif cmd in ["Z", "z"]:
                p.close()
                cur_x, cur_y = start_x, start_y

        if has_points:
            c.setLineCap(1 if cap_m else 0)
            c.setLineJoin(1 if join_m else 0)
            if fill_c:
                c.setFillColor(fill_c)
            if stroke_c:
                c.setStrokeColor(stroke_c)
                c.setLineWidth(sw_val * scale)
            c.drawPath(p, fill=1 if fill_c else 0, stroke=1 if stroke_c else 0)

    c.save()
    pdf_bytes = pdf_io.getvalue()
    pdf = pypdfium2.PdfDocument(pdf_bytes)
    page = pdf[0]
    bitmap = page.render(scale=2, fill_color=(0, 0, 0, 0))
    img = bitmap.to_pil()
    img.save(out_path)
    print(f"Rendered: {out_path}")

render_vector_file(z.read("res/drawable/ic_cash_box_new.xml"), "assets/icons/grid_cashbox.png", bg_color="#FDEEE9", size=144)
render_vector_file(z.read("res/drawable/ic_new_business_note.xml"), "assets/icons/grid_note.png", bg_color="#FEF5E7", size=144)
render_vector_file(z.read("res/drawable/ic_super_qr_new.xml"), "assets/icons/grid_qr.png", bg_color="#FCE8E8", size=144)
render_vector_file(z.read("res/drawable/ic_stock_new.xml"), "assets/icons/grid_stock.png", bg_color="#FCE8E8", size=144)
render_vector_file(z.read("res/drawable/ic_multi_business_new.xml"), "assets/icons/grid_multi_biz.png", bg_color="#E8FCE8", size=144)
render_vector_file(z.read("res/drawable/ic_bulk_tagada_new.xml"), "assets/icons/grid_bulk_tagada.png", bg_color="#E8FCE8", size=144)
render_vector_file(z.read("res/drawable/ic_tally_message_new.xml"), "assets/icons/grid_tally_msg.png", bg_color="#FCE8E8", size=144)
render_vector_file(z.read("res/drawable/backup.xml"), "assets/icons/grid_backup.png", fill_override="#16A34A", size=144)

# Render Nav Icons
render_vector_file(z.read("res/drawable/ic_nav_tally_selected.xml"), "assets/nav/nav_home_active.png", stroke_override="#B81414", size=96)
render_vector_file(z.read("res/drawable/ic_nav_tally_un_selected.xml"), "assets/nav/nav_home.png", stroke_override="#757575", size=96)
render_vector_file(z.read("res/drawable/ic_nav_cash_box_selected.xml"), "assets/nav/nav_cashbox_active.png", stroke_override="#B81414", size=96)
render_vector_file(z.read("res/drawable/ic_nav_cash_box_un_selected.xml"), "assets/nav/nav_cashbox.png", stroke_override="#757575", size=96)
render_vector_file(z.read("res/drawable/ic_nav_wallet_selected.xml"), "assets/nav/nav_tallypay_active.png", stroke_override="#B81414", size=96)
render_vector_file(z.read("res/drawable/ic_nav_wallet_un_selected.xml"), "assets/nav/nav_tallypay.png", stroke_override="#757575", size=96)
render_vector_file(z.read("res/drawable/ic_add_user.xml"), "assets/icons/ic_add_user.png", fill_override="#FFFFFF", size=120)

print("All authentic icons generated successfully!")
