"""A single variable-width contour around the established ribbon centerline.

No overlapping strokes: the changing width is part of the contour itself.
"""
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[1]


def ribbon(name, size, segments):
    points = []
    for segment in segments:
        a, b, c, d = segment
        for step in range(100):
            t = step / 100
            u = 1 - t
            points.append(tuple(u**3*a[k] + 3*u*u*t*b[k] + 3*u*t*t*c[k] + t**3*d[k] for k in (0, 1)))
    points.append(segments[-1][-1])
    lengths = [0.0]
    for a, b in zip(points, points[1:]):
        lengths.append(lengths[-1] + math.dist(a, b))
    left, right = [], []
    for i, point in enumerate(points):
        a, b = points[max(0, i-1)], points[min(len(points)-1, i+1)]
        dx, dy = b[0]-a[0], b[1]-a[1]
        distance = math.hypot(dx, dy)
        t = lengths[i]/lengths[-1]
        half = (.32 + .72*math.sin(3.4*math.pi*t + .2)**2) * (.25 + .75*math.sin(math.pi*t)**.3)
        normal = (-dy/distance*half, dx/distance*half)
        left.append((point[0]+normal[0], point[1]+normal[1]))
        right.append((point[0]-normal[0], point[1]-normal[1]))
    outline = left + right[::-1]
    path = 'M ' + ' L '.join(f'{x:.2f} {y:.2f}' for x, y in outline) + ' Z'
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size[0]} {size[1]}">
<defs><linearGradient id="silk" x1="0" y1="0" x2="1" y2="1">
<stop stop-color="#9f211c"/><stop offset=".2" stop-color="#c94638"/><stop offset=".28" stop-color="#eea295"/>
<stop offset=".32" stop-color="#bd3027"/><stop offset=".52" stop-color="#a62221"/>
<stop offset=".66" stop-color="#dc7767"/><stop offset=".7" stop-color="#f2b3a3"/><stop offset=".75" stop-color="#c23a2c"/>
<stop offset="1" stop-color="#a92a24"/></linearGradient></defs>
<path d="{path}" fill="url(#silk)"/>
</svg>'''
    (ROOT / 'dist/assets' / f'ribbon-{name}.svg').write_text(svg, encoding='utf-8')


ribbon('desktop', (1000, 390), [
    ((18,132),(88,79),(158,171),(250,125)),
    ((250,125),(342,79),(370,75),(390,126)),
    ((390,126),(416,194),(178,184),(182,271)),
    ((182,271),(185,343),(325,359),(431,303)),
    ((431,303),(537,247),(544,224),(604,260)),
    ((604,260),(644,284.6667),(681.3333,288.3333),(716,271)),
])
ribbon('mobile', (360, 280), [
    ((4,65),(42,31),(70,91),(111,65)),
    ((111,65),(152,39),(171,38),(191,64)),
    ((191,64),(221,108),(57,107),(65,169)),
    ((65,169),(72,212),(181,184),(208,192)),
    ((208,192),(235,200),(210,221),(146,235)),
])
print('Built desktop and mobile ribbons: one continuous filled contour each.')
