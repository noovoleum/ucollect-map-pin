// Oracle = the committed ../fixtures (written by `node verify.mjs --update`, reviewed in git).
// Monorepo-only test: it reads fixtures from the repository root.
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:noovoleum_map_pin/flutter_map_pin.dart';

T _enum<T extends Enum>(List<T> values, String wire) => values.byName(wire == 'collection_point'
    ? 'collectionPoint'
    : wire == 'new'
        ? 'new_'
        : wire);

void main() {
  final cases = (jsonDecode(File('../fixtures/cases.json').readAsStringSync()) as List).cast<Map<String, dynamic>>();

  test('fixture set covers the matrix', () => expect(cases.length, 45));

  for (final c in cases) {
    test('parity ${c['name']}', () {
      final p = c['props'] as Map<String, dynamic>;
      final fr = p['frame'] as Map<String, dynamic>?;
      final svg = pinSvg(
        state: _enum(PinState.values, p['state'] as String),
        kind: _enum(PinKind.values, p['kind'] as String),
        banner: p['banner'] == null ? null : _enum(PinBanner.values, p['banner'] as String),
        frame: fr == null
            ? null
            : PinFrame(
                pattern: _enum(FramePattern.values, fr['pattern'] as String),
                colors: [for (final x in fr['colors'] as List) if (x is String) x]),
        size: (p['size'] as num? ?? 34).toDouble(),
      );
      expect(svg, File('../fixtures/${c['name']}.svg').readAsStringSync());
    });
  }

  test('NaN size throws', () {
    expect(() => pinSvg(state: PinState.available, kind: PinKind.station, size: double.nan), throwsArgumentError);
  });

  // Unframed available station: 56u wide, 88.5u tall => size 40 is 25.31 x 40 dp.
  for (final (size, ratio, w, h) in [(40.0, 1.0, 25, 40), (40.0, 3.0, 76, 120), (80.0, 1.0, 51, 80), (80.0, 3.0, 152, 240)]) {
    testWidgets('pinPng size $size ratio $ratio is ${w}x$h', (t) async {
      final bytes = await t.runAsync(
          () => pinPng(state: PinState.available, kind: PinKind.station, size: size, pixelRatio: ratio));
      final hdr = ByteData.sublistView(bytes!, 16, 24);
      expect(utf8.decode(bytes.sublist(1, 4)), 'PNG');
      expect([hdr.getUint32(0), hdr.getUint32(4)], [w, h]);
    });
  }

  testWidgets('pinPng rejects a bad pixelRatio before allocating', (t) async {
    Object? err;
    await t.runAsync(() async {
      try {
        await pinPng(state: PinState.closed, kind: PinKind.station, pixelRatio: 0);
      } catch (e) {
        err = e;
      }
    });
    expect(err, isArgumentError);
  });
}
