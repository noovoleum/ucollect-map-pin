// Flutter layer: widget + PNG bytes for maplibre_gl `addImage`.
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'src/pin.dart';

export 'map_pin.dart';

/// `MapPin(state: PinState.closed, kind: PinKind.station, semanticsLabel: 'Closed station')`
class MapPin extends StatelessWidget {
  final PinState state;
  final PinKind kind;
  final PinFrame? frame;
  final PinBanner? banner;
  final double size;

  /// Accessible name. Null = decorative (excluded from semantics).
  final String? semanticsLabel;

  const MapPin({
    super.key,
    required this.state,
    required this.kind,
    this.frame,
    this.banner,
    this.size = 34,
    this.semanticsLabel,
  });

  @override
  Widget build(BuildContext context) {
    final d = pinDrawing(state: state, kind: kind, frame: frame, banner: banner, size: size);
    return SvgPicture.string(d.svg,
        width: d.width,
        height: d.height,
        semanticsLabel: semanticsLabel,
        excludeFromSemantics: semanticsLabel == null);
  }
}

/// PNG of `size` dp rendered at `pixelRatio` (physical px = logical size x ratio, rounded).
Future<Uint8List> pinPng({
  required PinState state,
  required PinKind kind,
  PinFrame? frame,
  PinBanner? banner,
  double size = 34,
  double pixelRatio = 1,
}) async {
  if (!(pixelRatio > 0 && pixelRatio <= 8)) throw ArgumentError.value(pixelRatio, 'pixelRatio', 'must be in (0, 8]');
  final d = pinDrawing(state: state, kind: kind, frame: frame, banner: banner, size: size);
  final w = math.max(1, (d.width * pixelRatio).round()), h = math.max(1, (d.height * pixelRatio).round());
  PictureInfo? info;
  ui.Picture? pic;
  ui.Image? img;
  try {
    info = await vg.loadPicture(SvgStringLoader(d.svg), null);
    // loadPicture sizes the picture to the viewBox; scale it to the requested logical size.
    final rec = ui.PictureRecorder();
    Canvas(rec)
      ..scale(w / info.size.width, h / info.size.height)
      ..drawPicture(info.picture);
    pic = rec.endRecording();
    img = await pic.toImage(w, h);
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    return bytes!.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes);
  } finally {
    img?.dispose();
    pic?.dispose();
    info?.picture.dispose();
  }
}
