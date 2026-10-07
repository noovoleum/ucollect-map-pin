// Pure Dart (no Flutter import): the uCollect map pin as SVG. Props in, artwork out.
import 'src/pin.dart';

export 'src/pin.dart' show PinState, PinKind, FramePattern, PinBanner, PinFrame, pinStateColors;

/// SVG markup for one pin. `size` = unframed pin height (pole tip to head tip) in dp, clamped 8..512.
String pinSvg({
  required PinState state,
  required PinKind kind,
  PinFrame? frame,
  PinBanner? banner,
  double size = 34,
}) =>
    pinDrawing(state: state, kind: kind, frame: frame, banner: banner, size: size).svg;
