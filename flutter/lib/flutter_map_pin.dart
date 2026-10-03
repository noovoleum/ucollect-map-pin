// Flutter layer: widget + PNG bytes for MapLibre `addImage`.
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'map_pin.dart';

export 'map_pin.dart';

/// `MapPin(spec: PinSpec(state: 'closed', frame: PinFrame('stripes', ['#E31E24', '#FFD200'])))`
class MapPin extends StatelessWidget {
  final PinSpec spec;
  final PinOptions options;
  const MapPin({super.key, required this.spec, this.options = const PinOptions()});

  @override
  Widget build(BuildContext context) => SvgPicture.string(pinSvg(spec, options));
}

/// PNG bytes for `MapLibreMapController.addImage(pinImageKey(spec), bytes)`.
/// Render at device pixel ratio so pins stay sharp: `pixelRatio: MediaQuery.devicePixelRatioOf(ctx)`.
Future<Uint8List> pinPng(PinSpec spec, {PinOptions options = const PinOptions(), double pixelRatio = 3}) async {
  final info = await vg.loadPicture(SvgStringLoader(pinSvg(spec, options)), null);
  final w = (info.size.width * pixelRatio).ceil(), h = (info.size.height * pixelRatio).ceil();
  final rec = ui.PictureRecorder();
  Canvas(rec)
    ..scale(pixelRatio)
    ..drawPicture(info.picture);
  final img = await rec.endRecording().toImage(w, h);
  info.picture.dispose();
  final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
  img.dispose();
  return bytes!.buffer.asUint8List();
}
