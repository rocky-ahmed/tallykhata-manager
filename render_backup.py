import sys, io, re
import pypdfium2
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

sys.stdout.reconfigure(encoding="utf-8")

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

target_size = 240
scale = target_size / 42.0

pdf_io = io.BytesIO()
c = canvas.Canvas(pdf_io, pagesize=(target_size, target_size))

def tx(x): return x * scale
def ty(y): return target_size - (y * scale)

path_data = "M9.65,29.997C6.983,29.997 4.708,29.055 2.825,27.172C0.942,25.288 0,22.997 0,20.297C0,17.864 0.817,15.714 2.45,13.847C4.083,11.98 6.133,10.93 8.6,10.697C9.1,7.597 10.525,5.047 12.875,3.047C15.225,1.047 17.967,0.047 21.1,0.047C24.567,0.047 27.508,1.305 29.925,3.822C32.342,6.339 33.55,9.364 33.55,12.897V14.797H34.15C36.35,14.73 38.208,15.422 39.725,16.872C41.242,18.322 42,20.163 42,22.397C42,24.463 41.25,26.247 39.75,27.747C38.25,29.247 36.467,29.997 34.4,29.997H22.15V14.247L25.75,17.847C25.983,18.114 26.258,18.239 26.575,18.222C26.892,18.205 27.15,18.08 27.35,17.847C27.583,17.614 27.7,17.338 27.7,17.022C27.7,16.705 27.583,16.43 27.35,16.197L22,10.897C21.733,10.63 21.4,10.497 21,10.497C20.6,10.497 20.267,10.63 20,10.897L14.65,16.247C14.417,16.48 14.308,16.755 14.325,17.072C14.342,17.389 14.45,17.647 14.65,17.847C14.883,18.08 15.167,18.188 15.5,18.172C15.833,18.155 16.1,18.03 16.3,17.797L19.85,14.247V29.997H9.65Z"

p = c.beginPath()
for cmd, args in parse_svg_path(path_data):
    if cmd == 'M':
        p.moveTo(tx(args[0]), ty(args[1]))
        cur_x, cur_y = args[0], args[1]
    elif cmd == 'L':
        p.lineTo(tx(args[0]), ty(args[1]))
        cur_x, cur_y = args[0], args[1]
    elif cmd == 'H':
        p.lineTo(tx(args[0]), ty(cur_y))
        cur_x = args[0]
    elif cmd == 'V':
        p.lineTo(tx(cur_x), ty(args[0]))
        cur_y = args[0]
    elif cmd == 'C':
        for j in range(0, len(args), 6):
            p.curveTo(tx(args[j]), ty(args[j+1]), tx(args[j+2]), ty(args[j+3]), tx(args[j+4]), ty(args[j+5]))
            cur_x, cur_y = args[j+4], args[j+5]
    elif cmd in ['Z', 'z']:
        p.close()

c.setFillColor(HexColor('#DCFCE7'))
c.setStrokeColor(HexColor('#16A34A'))
c.setLineWidth(1.8 * scale)
c.drawPath(p, fill=1, stroke=1)

c.save()
pdf_bytes = pdf_io.getvalue()
pdf = pypdfium2.PdfDocument(pdf_bytes)
bitmap = pdf[0].render(scale=2, fill_color=(0, 0, 0, 0))
img = bitmap.to_pil()
img.save('assets/icons/grid_backup.png')
print('Rendered authentic grid_backup.png!')
