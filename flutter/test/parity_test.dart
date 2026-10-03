// Parity: Dart must emit the exact bytes the JS package emits for every fixture case.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:noovoleum_map_pin/flutter_map_pin.dart';

void main() {
  final dir = Directory('../fixtures');
  final cases = (jsonDecode(File('${dir.path}/cases.json').readAsStringSync()) as List).cast<Map<String, dynamic>>();

  test('fixture set is non-trivial', () => expect(cases.length, greaterThan(30)));

  for (final c in cases) {
    test('parity ${c['name']}', () {
      final o = (c['options'] as Map?)?.cast<String, dynamic>() ?? {};
      final opts = PinOptions(
        size: (o['size'] as num? ?? 40).toDouble(),
        frameWidth: (o['frameWidth'] as num? ?? 5).toDouble(),
        bannerPosition: o['bannerPosition'] as String? ?? 'low',
        bannerScale: (o['bannerScale'] as num? ?? 1.5).toDouble(),
        badgePosition: o['badgePosition'] as String? ?? 'top-left',
        badgeRadius: (o['badgeRadius'] as num? ?? 10).toDouble(),
      );
      final spec = PinSpec.fromJson((c['spec'] as Map).cast<String, dynamic>());
      expect(pinSvg(spec, opts), File('${dir.path}/${c['name']}.svg').readAsStringSync());
      expect(pinImageKey(spec, opts), c['key']);
      expect(pinZ(spec), c['z']);
    });
  }

  testWidgets('pinPng renders a non-empty PNG', (t) async {
    final bytes = await t.runAsync(() => pinPng(const PinSpec(state: 'closed',
        frame: PinFrame('stripes', ['#E31E24', '#FFD200'])), pixelRatio: 2));
    expect(bytes!.sublist(1, 4), utf8.encode('PNG'));
    expect(bytes.length, greaterThan(500));
  });
}
