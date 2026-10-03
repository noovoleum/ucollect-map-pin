// Core: pure Dart, no Flutter import. Port of js/index.js — must emit byte-identical SVG
// (enforced by test/parity_test.dart against ../fixtures generated from the JS package).
import 'dart:convert';
import 'dart:math' as math;

const _bodyCx = 40.0, _bodyCy = 46.0, _bodyR = 28.0, _bodyTip = 2.0;
const _logoArc = 'M43.051,61.624 A16.88,16.88 0 1 1 56.631,48.510 L50.195,47.141 A10.3,10.3 0 1 0 41.909,55.144 Z';
const _logoHead = 'M41.000,48.000 L53.500,57.500 L41.000,67.500 Z';
const _logoCx = 40.12, _logoCy = 46.0;
const _sep = 1.4;

/// One canvas for every pin; pole tip is bottom-centre → MapLibre `iconAnchor: 'bottom'`.
const pinViewBox = [-16.0, -18.0, 112.0, 108.5];

enum PinState { available, closed, planned, maintenance }

enum PinKind { station, collectionPoint }

/// Partner-controlled frame. Max 3 colours are drawn.
class PinFrame {
  final String pattern; // solid | stripes | rings
  final List<String> colors;
  const PinFrame(this.pattern, this.colors);
  factory PinFrame.fromJson(Map<String, dynamic> j) =>
      PinFrame(j['pattern'] as String, (j['colors'] as List).cast<String>());
  bool get _valid => const ['solid', 'stripes', 'rings'].contains(pattern) && colors.isNotEmpty;
}

/// Mirrors the backend `pin` payload. Fill and icon are deliberately absent — uCollect owns them.
class PinSpec {
  final String? state, kind, banner;
  final PinFrame? frame;
  const PinSpec({this.state, this.kind, this.frame, this.banner});
  factory PinSpec.fromJson(Map<String, dynamic> j) => PinSpec(
        state: j['state'] as String?,
        kind: j['kind'] as String?,
        banner: j['banner'] as String?,
        frame: j['frame'] is Map ? PinFrame.fromJson((j['frame'] as Map).cast<String, dynamic>()) : null,
      );
}

class PinOptions {
  final double size, frameWidth, bannerScale, badgeRadius;
  final String bannerPosition, badgePosition;
  const PinOptions({
    this.size = 40,
    this.frameWidth = 5,
    this.bannerPosition = 'low',
    this.bannerScale = 1.5,
    this.badgePosition = 'top-left',
    this.badgeRadius = 10,
  });
}

const _states = {
  //             fill       opacity icon   badge    banner
  'available': [null, 1.00, null, null, null],
  'closed': ['#F2B200', 0.55, null, 'clock', null],
  'planned': ['#8A949C', 0.50, null, null, 'SOON'],
  'maintenance': ['#D93C4E', 0.60, 'x', null, null],
};
const _kinds = {
  'station': ['#70AD47', 'uco'],
  'collection_point': ['#7C4DAF', 'house'],
};
const _bannerFill = {'SOON': '#3A444C', 'NEW': '#2979C7', 'PROMO': '#E0457B'};
const _bannerY = {'mid': _bodyCy + _bodyR - 18, 'low': _bodyCy + _bodyR - 8};
const _badgeXY = {
  'top-left': [_bodyCx - 21, _bodyCy - 19],
  'top-right': [_bodyCx + 21, _bodyCy - 19],
};
const _z = {'available': 4, 'closed': 3, 'maintenance': 2, 'planned': 1};

class ResolvedPin {
  final String state, kind, fill, icon;
  final double opacity;
  final PinFrame? frame;
  final String? banner, badge;
  const ResolvedPin(this.state, this.kind, this.fill, this.icon, this.opacity, this.frame, this.banner, this.badge);
}

String _f(num n, [int d = 3]) => n.toStringAsFixed(d);

/// Unknown state/kind degrade to available/station — a pin must never vanish.
ResolvedPin resolvePin(PinSpec spec) {
  final st = _states.containsKey(spec.state) ? spec.state! : 'available';
  final kind = _kinds.containsKey(spec.kind) ? spec.kind! : 'station';
  final s = _states[st]!;
  final fr = spec.frame;
  final banner = (s[4] as String?) ??
      (st == 'available' && (spec.banner == 'NEW' || spec.banner == 'PROMO') ? spec.banner : null);
  return ResolvedPin(st, kind, (s[0] as String?) ?? _kinds[kind]![0], (s[2] as String?) ?? _kinds[kind]![1],
      s[1] as double, fr != null && fr._valid ? fr : null, banner, s[3] as String?);
}

String _bodyPath([double grow = 0]) {
  final d0 = _bodyCy - _bodyTip, a = math.asin(_bodyR / d0), rr = _bodyR + grow, d = d0 + grow / math.sin(a);
  final phi = math.acos(rr / d), x1 = _bodyCx - rr * math.sin(phi), x2 = _bodyCx + rr * math.sin(phi);
  final y = _bodyCy - rr * math.cos(phi);
  return 'M${_f(_bodyCx)},${_f(_bodyCy - d)} L${_f(x2)},${_f(y)} A${_f(rr)},${_f(rr)} 0 1 1 ${_f(x1)},${_f(y)} Z';
}

String _frame(PinFrame? fr, double F) {
  if (fr == null || !(F > 0)) return '';
  final cols = fr.colors.take(3).toList();
  final b = StringBuffer('<path d="${_bodyPath(_sep + F + 1)}" fill="#1f2328" fill-opacity="0.35"/>');
  if (fr.pattern == 'rings') {
    for (var k = 0; k < cols.length; k++) {
      b.write('<path d="${_bodyPath(_sep + F * (cols.length - k) / cols.length)}" fill="${cols[k]}"/>');
    }
  } else if (fr.pattern == 'stripes') {
    final w = math.max(3.0, F * 0.9), id = 'mpc${_f(F, 2).replaceFirst('.', '_')}';
    final st = StringBuffer();
    for (var i = 0; i < (200 / w).floor(); i++) {
      st.write('<rect x="${_f(-60 + i * w, 2)}" y="-40" width="${_f(w, 2)}" height="200" fill="${cols[i % cols.length]}"/>');
    }
    b.write('<clipPath id="$id"><path d="${_bodyPath(_sep + F)}"/></clipPath>'
        '<g clip-path="url(#$id)"><g transform="rotate(35 40 46)">$st</g></g>');
  } else {
    b.write('<path d="${_bodyPath(_sep + F)}" fill="${cols[0]}"/>');
  }
  b.write('<path d="${_bodyPath(_sep)}" fill="#fff"/>');
  return b.toString();
}

String _icon(String name) {
  const cx = _logoCx, cy = _logoCy;
  if (name == 'uco') {
    return '<path d="$_logoArc" fill="#fff"/><path d="$_logoHead" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>';
  }
  if (name == 'house') {
    return '<g transform="translate(${_f(cx)} ${_f(cy)}) scale(1.55) translate(-12 -12.5)"><path d="M12 2.2 1.2 11.6h3.1V22h5.6v-6.4h4.2V22h5.6V11.6h3.1z" fill="#fff" stroke="#fff" stroke-width="0.8" stroke-linejoin="round"/></g>';
  }
  const k = 11;
  return '<path d="M${_f(cx - k)},${_f(cy - k)} L${_f(cx + k)},${_f(cy + k)} M${_f(cx + k)},${_f(cy - k)} L${_f(cx - k)},${_f(cy + k)}" stroke="#fff" stroke-width="6.2" stroke-linecap="round"/>';
}

String _banner(String? text, String pos, double size) {
  if (text == null) return '';
  final fs = 11.5 * size, w = 0.84 * fs * text.length + 12 * size, h = 15 * size;
  const cx = _bodyCx;
  final y = _bannerY[pos]! - h / 2 + 7.5;
  return '<rect x="${_f(cx - w / 2 - 2)}" y="${_f(y - 2)}" width="${_f(w + 4)}" height="${_f(h + 4)}" rx="${_f(h / 2 + 2)}" fill="#fff"/>'
      '<rect x="${_f(cx - w / 2)}" y="${_f(y)}" width="${_f(w)}" height="${_f(h)}" rx="${_f(h / 2)}" fill="${_bannerFill[text]}"/>'
      '<text x="${_f(cx)}" y="${_f(y + h * 0.75)}" text-anchor="middle" font-family="Inter,Roboto,Arial,sans-serif" font-weight="800" font-size="${_f(fs)}" letter-spacing="0.5" fill="#fff">$text</text>';
}

String _badge(String? kind, String pos, double r) {
  if (kind != 'clock') return '';
  final bx = _badgeXY[pos]![0], by = _badgeXY[pos]![1], sw = _f(r * 0.2);
  return '<circle cx="${_f(bx)}" cy="${_f(by)}" r="${_f(r + 2)}" fill="#fff"/><circle cx="${_f(bx)}" cy="${_f(by)}" r="${_f(r)}" fill="#4A3A00"/>'
      '<circle cx="${_f(bx)}" cy="${_f(by)}" r="${_f(r * 0.6)}" fill="none" stroke="#fff" stroke-width="$sw"/>'
      '<path d="M${_f(bx)} ${_f(by - r * 0.36)}V${_f(by)}l${_f(r * 0.3)} ${_f(r * 0.2)}" fill="none" stroke="#fff" stroke-width="$sw" stroke-linecap="round" stroke-linejoin="round"/>';
}

/// SVG markup for a pin. `options.size` = on-screen width in px of an unframed pin canvas.
String pinSvg(PinSpec spec, [PinOptions o = const PinOptions()]) {
  final p = resolvePin(spec);
  final k = o.size / 84;
  final body = '${_frame(p.frame, o.frameWidth)}'
      '<rect x="37" y="70" width="6" height="20.5" rx="3" fill="#384240"/>'
      '<path d="${_bodyPath()}" fill="${p.fill}"/>'
      '${_icon(p.icon)}'
      '${_banner(p.banner, o.bannerPosition, o.bannerScale)}'
      '${_badge(p.badge, o.badgePosition, o.badgeRadius)}';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="${_f(112 * k, 1)}" height="${_f(108.5 * k, 1)}" viewBox="-16 -18 112 108.5">'
      '<g opacity="${p.opacity.toStringAsFixed(2)}">$body</g></svg>';
}

/// Stable key for one look — register each distinct key once with `addImage`.
String pinImageKey(PinSpec spec, [PinOptions o = const PinOptions()]) {
  final p = resolvePin(spec);
  String n(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();
  final fr = p.frame == null ? '' : '${p.frame!.pattern}:${p.frame!.colors.take(3).join(',')}';
  return ['pin', p.state, p.kind, p.banner ?? '', fr, n(o.frameWidth), o.bannerPosition, n(o.bannerScale),
      o.badgePosition, n(o.badgeRadius)].join('|');
}

/// Map z-order: available on top (use as symbol sort key / zIndex).
int pinZ(PinSpec spec) => _z[resolvePin(spec).state]!;

/// Convenience for raw backend JSON.
String pinSvgFromJson(String json, [PinOptions o = const PinOptions()]) =>
    pinSvg(PinSpec.fromJson(jsonDecode(json) as Map<String, dynamic>), o);
