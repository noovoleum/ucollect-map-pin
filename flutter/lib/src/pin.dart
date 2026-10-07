// Internal drawing core. Byte-identical port of ../../pin.js, enforced by test/parity_test.dart.
import 'dart:math' as math;

enum PinState { available, closed, planned, maintenance }

enum PinKind { station, collectionPoint }

enum FramePattern { solid, stripes, rings }

/// `new_` because `new` is a Dart keyword; it draws the NEW banner.
enum PinBanner { soon, new_, promo }

/// Partner frame. Only the first 3 entries are read; each must be a `#RRGGBB` string or it is skipped.
class PinFrame {
  final FramePattern pattern;
  final List<String> colors;
  const PinFrame({required this.pattern, required this.colors});
}

const _cx = 40.0, _cy = 46.0, _r = 28.0, _tip = 2.0, _poleTip = 90.5;
const frameWidth = 7.0;
const _sep = 1.4;
const _logoArc = 'M43.051,61.624 A16.88,16.88 0 1 1 56.631,48.510 L50.195,47.141 A10.3,10.3 0 1 0 41.909,55.144 Z';
const _logoHead = 'M41.000,48.000 L53.500,57.500 L41.000,67.500 Z';
const _house = 'M12 2.2 1.2 11.6h3.1V22h5.6v-6.4h4.2V22h5.6V11.6h3.1z';
// Status badges sit on the upper-right shoulder (clear of the logo arrowhead at lower right).
const _bx = 63.5, _by = 24.8; // closed Zz anchor
const _xr = 16.0, _xx = 67.0, _xy = 21.5; // maintenance: X in a disc
const _zk = 1.8; // closed: bare Zz (no disc), scale
const _zz = [[-2.5, -6.5, 8.0, 2.6], [7.0, -14.5, 5.0, 2.1]]; // [x, y, size, stroke] per Z
const _bannerY = 62.0, _bannerH = 19.0;
const _banner = {
  PinBanner.soon: ['#3A444C', '15.140', '49.720', '16.640', '46.720', 'M28.360,67.660 C27.400,65.020 22.240,65.020 22.240,68.620 C22.240,71.980 28.360,70.780 28.360,74.380 C28.360,78.220 22.840,78.220 22.000,75.340 M35.080,65.500 C30.280,65.500 30.280,77.500 35.080,77.500 C39.880,77.500 39.880,65.500 35.080,65.500 Z M44.920,65.500 C40.120,65.500 40.120,77.500 44.920,77.500 C49.720,77.500 49.720,65.500 44.920,65.500 Z M51.160,77.500 L51.160,65.500 L58.360,77.500 L58.360,65.500'],
  PinBanner.new_: ['#2979C7', '19.100', '41.800', '20.600', '38.800', 'M25.600,77.500 L25.600,65.500 L32.800,77.500 L32.800,65.500 M41.680,65.500 L35.440,65.500 L35.440,77.500 L41.680,77.500 M35.440,71.500 L40.720,71.500 M44.320,65.500 L46.840,77.500 L49.360,68.620 L51.880,77.500 L54.400,65.500'],
  PinBanner.promo: ['#E0457B', '9.860', '60.280', '11.360', '57.280', 'M16.360,77.500 L16.360,65.500 L19.960,65.500 C23.920,65.500 23.920,72.220 19.960,72.220 L16.360,72.220 M25.720,77.500 L25.720,65.500 L29.320,65.500 C33.280,65.500 33.280,72.220 29.320,72.220 L25.720,72.220 M29.320,72.220 L32.680,77.500 M38.680,65.500 C33.880,65.500 33.880,77.500 38.680,77.500 C43.480,77.500 43.480,65.500 38.680,65.500 Z M44.920,77.500 L44.920,65.500 L49.360,73.180 L53.800,65.500 L53.800,77.500 M60.040,65.500 C55.240,65.500 55.240,77.500 60.040,77.500 C64.840,77.500 64.840,65.500 60.040,65.500 Z'],
};
final _hex = RegExp(r'^#[0-9a-fA-F]{6}$');

/// Head fill (`#RRGGBB`) and group opacity per state, the same for both kinds. For things drawn
/// beside the pin (e.g. zoomed-out dots); the pin itself is drawn from this table.
const pinStateColors = <PinState, ({String fill, double opacity})>{
  PinState.available: (fill: '#0B5A15', opacity: 1.0), // logo green (images/new_logo.png), both kinds
  PinState.closed: (fill: '#E0B450', opacity: 0.5),
  PinState.planned: (fill: '#8A949C', opacity: 0.5),
  PinState.maintenance: (fill: '#D93C4E', opacity: 0.6),
};

String _f(num n, [int d = 3]) => n.toStringAsFixed(d);

({double top, double len, String d}) _head(double g) {
  const d0 = _cy - _tip;
  final rr = _r + g, d = d0 + g * d0 / _r, phi = math.acos(rr / d);
  final sx = rr * math.sin(phi), y = _cy - rr * math.cos(phi);
  return (
    top: _cy - d,
    len: 2 * math.sqrt(d * d - rr * rr) + rr * (2 * math.pi - 2 * phi),
    d: 'M${_f(_cx)},${_f(_cy - d)} L${_f(_cx + sx)},${_f(y)} A${_f(rr)},${_f(rr)} 0 1 1 ${_f(_cx - sx)},${_f(y)} Z',
  );
}

List<String> _frame(PinFrame? frame, double fw) {
  if (frame == null) return const [];
  // Inspect the first 3 entries by index (no caller methods); only #RRGGBB strings reach the SVG.
  final colors = frame.colors, pattern = frame.pattern, cols = <String>[];
  for (var i = 0; i < math.min(colors.length, 3); i++) {
    final c = colors[i];
    if (_hex.hasMatch(c)) cols.add(c);
  }
  final n = cols.length;
  if (n == 0) return const [];
  final out = ['<path d="${_head(_sep + fw + 1).d}" fill="#1f2328" fill-opacity="0.35"/>'];
  if (pattern == FramePattern.stripes) {
    final mid = _head(_sep + fw / 2), m = n * math.max(1, (mid.len / (n * 6)).round()), w = mid.len / m;
    for (var j = n - 1; j >= 0; j--) {
      final dash = j < n - 1 ? ' stroke-dasharray="${_f((j + 1) * w)} ${_f((n - 1 - j) * w)}"' : '';
      out.add('<path d="${mid.d}" fill="none" stroke="${cols[j]}" stroke-width="${_f(fw, 1)}"$dash/>');
    }
  } else {
    final rings = pattern == FramePattern.rings ? n : 1;
    for (var k = 0; k < rings; k++) {
      out.add('<path d="${_head(_sep + fw * (rings - k) / rings).d}" fill="${cols[k]}"/>');
    }
  }
  out.add('<path d="${_head(_sep).d}" fill="#fff"/>');
  return out;
}

String _icon(PinKind kind) => kind == PinKind.station
    ? '<path d="$_logoArc" fill="#fff"/><path d="$_logoHead" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>'
    : '<g transform="translate(40.120 46.000) scale(1.55) translate(-12 -12.5)"><path d="$_house" fill="#fff" stroke="#fff" stroke-width="0.8" stroke-linejoin="round"/></g>';

String _badge(PinState state) {
  const line = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
  if (state == PinState.closed) {
    String d(List<double> z) =>
        'M${_f(_bx + z[0] * _zk)} ${_f(_by + z[1] * _zk)}h${_f(z[2] * _zk)}l${_f(-z[2] * _zk)} ${_f(z[2] * _zk)}h${_f(z[2] * _zk)}';
    return _zz.map((z) => '<path d="${d(z)}" $line stroke="#fff" stroke-width="${_f((z[3] + 3) * _zk)}"/>').join() +
        _zz.map((z) => '<path d="${d(z)}" $line stroke="#3A2E00" stroke-width="${_f(z[3] * _zk)}"/>').join();
  }
  if (state != PinState.maintenance) return '';
  const q = 4.2 * _xr / 10;
  return '<circle cx="${_f(_xx)}" cy="${_f(_xy)}" r="${_f(_xr + 2)}" fill="#fff"/><circle cx="${_f(_xx)}" cy="${_f(_xy)}" r="${_f(_xr)}" fill="#7A1420"/>'
      '<path d="M${_f(_xx - q)} ${_f(_xy - q)}L${_f(_xx + q)} ${_f(_xy + q)}M${_f(_xx + q)} ${_f(_xy - q)}L${_f(_xx - q)} ${_f(_xy + q)}" $line stroke="#fff" stroke-width="${_f(3 * _xr / 10)}"/>';
}

String _bannerSvg(List<String>? b) {
  if (b == null) return '';
  return '<rect x="${b[1]}" y="${_f(_bannerY - 1.5)}" width="${b[2]}" height="${_f(_bannerH + 3)}" rx="${_f(_bannerH / 2 + 1.5)}" fill="#fff"/>'
      '<rect x="${b[3]}" y="${_f(_bannerY)}" width="${b[4]}" height="${_f(_bannerH)}" rx="${_f(_bannerH / 2)}" fill="${b[0]}"/>'
      '<path d="${b[5]}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
}

/// Markup plus logical size (px/dp). `fw` is internal (comparison sheet only).
({String svg, double width, double height}) pinDrawing({
  required PinState state,
  required PinKind kind,
  PinFrame? frame,
  PinBanner? banner,
  double size = 34,
  double fw = frameWidth,
}) {
  if (size.isNaN) throw ArgumentError.value(size, 'size', 'must be a number');
  final k = size.clamp(8.0, 512.0) / (_poleTip - _tip);
  final colors = pinStateColors[state]!;
  final fill = colors.fill, opacity = colors.opacity.toStringAsFixed(2);
  final b = banner == null ? null : _banner[banner]!;
  final fr = _frame(frame, fw);
  var hw = _r, top = _tip;
  if (fr.isNotEmpty) {
    hw = _r + _sep + fw + 1;
    top = _head(_sep + fw + 1).top;
  }
  if (state == PinState.maintenance) {
    hw = math.max(hw, _xx - _cx + _xr + 2);
    top = math.min(top, _xy - _xr - 2);
  }
  if (state == PinState.closed) {
    for (final z in _zz) {
      final h = (z[3] + 3) * _zk / 2; // white halo half-width
      hw = math.max(hw, _bx + (z[0] + z[2]) * _zk + h - _cx + 1);
      top = math.min(top, _by + z[1] * _zk - h - 1);
    }
  }
  if (b != null) hw = math.max(hw, _cx - double.parse(b[1]));
  final w = 2 * hw * k, h = (_poleTip - top) * k;
  final svg = '<svg xmlns="http://www.w3.org/2000/svg" width="${_f(w, 2)}" height="${_f(h, 2)}" '
      'viewBox="${_f(_cx - hw)} ${_f(top)} ${_f(2 * hw)} ${_f(_poleTip - top)}"><g opacity="$opacity">'
      '${fr.join()}<rect x="37" y="70" width="6" height="20.5" rx="3" fill="#384240"/>'
      '<path d="${_head(0).d}" fill="$fill"/>${_icon(kind)}${_bannerSvg(b)}${_badge(state)}</g></svg>';
  return (svg: svg, width: w, height: h);
}
