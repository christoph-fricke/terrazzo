import stripAnsi from 'strip-ansi';
import { describe, expect, it } from 'vitest';
import defineConfig from '../config.js';
import type { TokensJSONError } from '../logger.js';
import parse from '../parse/index.js';
import type { TokenNormalized } from '../types.js';

describe('Tokens', () => {
  type Test = [
    string,
    {
      given: any;
      want: { error?: never; tokens: Record<string, TokenNormalized['$value']> } | { error: string; tokens?: never };
    },
  ];

  async function runTest({ given, want }: Test[1]) {
    const config = defineConfig({}, { cwd: new URL(import.meta.url) });
    let result: Awaited<ReturnType<typeof parse>> | undefined;
    try {
      result = await parse(given, { config });
    } catch (e) {
      const err = e as TokensJSONError;
      expect(stripAnsi(err.message)).toBe(want.error);

      // ensure TokenValidationError contains necessary properties
      expect(err.node?.type?.length).toBeGreaterThan(0);
      expect(err.node?.loc?.start?.line).toBeGreaterThanOrEqual(1);
    }

    if (result) {
      expect(want.tokens).toBeTruthy();
      expect(want.error).toBeUndefined();
      for (const id in result.tokens) {
        const { sourceNode, ...token } = result.tokens[id]!;
        expect(sourceNode).not.toBeFalsy();
        expect(token.$value).toEqual(want.tokens![id]);
      }
    }
  }

  describe('7 Alias', () => {
    const tests: Test[] = [
      [
        'valid: primitive',
        {
          given: {
            color: {
              base: { blue: { 500: { $type: 'color', $value: 'color(srgb 0 0.2 1)' } } },
              semantic: { $value: '{color.base.blue.500}' },
            },
          },
          want: {
            tokens: {
              'color.base.blue.500': { alpha: 1, channels: [0, 0.2, 1], colorSpace: 'srgb' },
              'color.semantic': { alpha: 1, channels: [0, 0.2, 1], colorSpace: 'srgb' },
            },
          },
        },
      ],
      [
        'valid: primitive (YAML)',
        {
          given: `color:
  $value: "{color.base.blue.500}"`,
          want: {
            tokens: { 'color.base.blue.500': { alpha: 1, channels: [0, 0.2, 1], colorSpace: 'srgb' } },
          },
        },
      ],
      [
        'valid: Font Weight',
        {
          given: {
            font: { weight: { bold: { $type: 'fontWeight', $value: 700 } } },
            bold: { $type: 'fontWeight', $value: '{font.weight.bold}' },
          },
          want: {
            tokens: {
              'font.weight.bold': 700,
              bold: 700,
            },
          },
        },
      ],
      [
        'valid: Font Weight (YAML)',
        {
          given: `bold:
  $type: fontWeight
  $value: "{font.weight.700}"
font:
  weight:
    $type: fontWeight
    700:
      $value: 700`,
          want: {
            tokens: { bold: '700', 'font.weight.700': 700 },
          },
        },
      ],
      [
        'valid: Stroke Style',
        {
          given: {
            buttonStroke: {
              $type: 'strokeStyle',
              $value: { lineCap: 'round', dashArray: ['{size.2}', '{size.3}'] },
            },
            size: {
              $type: 'dimension',
              '2': { $value: '0.125rem' },
              '3': { $value: '0.25rem' },
            },
          },
          want: {
            tokens: {
              buttonStroke: { lineCap: 'round', dashArray: ['0.125rem', '0.25rem'] },
              'size.2': '0.125rem',
              'size.3': '0.25rem',
            },
          },
        },
      ],
      [
        'valid: Border',
        {
          given: {
            color: { $type: 'color', semantic: { subdued: { $value: 'color(srgb 0 0 0 / 0.1)' } } },
            border: {
              size: { $type: 'dimension', default: { $value: '1px' } },
              style: { $type: 'strokeStyle', default: { $value: 'solid' } },
            },
            buttonBorder: {
              $type: 'border',
              $value: {
                color: '{color.semantic.subdued}',
                width: '{border.size.default}',
                style: '{border.style.default}',
              },
            },
          },
          want: {
            tokens: {
              'color.semantic.subdued': { alpha: 0.1, channels: [0, 0, 0], colorSpace: 'srgb' },
              'border.size.default': '1px',
              'border.style.default': 'solid',
              buttonBorder: {
                color: { alpha: 0.1, channels: [0, 0, 0], colorSpace: 'srgb' },
                width: '1px',
                style: 'solid',
              },
            },
          },
        },
      ],
      [
        'valid: Gradient',
        {
          given: {
            color: {
              $type: 'color',
              blue: { 500: { $value: 'rgb(2, 101, 220)' } },
              purple: { 800: { $value: 'rgb(93, 19, 183)' } },
            },
            perc: {
              $type: 'number',
              0: { $value: 0 },
              100: { $value: 1 },
            },
            gradient: {
              $type: 'gradient',
              $value: [
                { color: '{color.blue.500}', position: '{perc.0}' },
                { color: '{color.purple.800}', position: '{perc.100}' },
              ],
            },
          },
          want: {
            tokens: {
              'color.blue.500': {
                alpha: 1,
                channels: [0.00784313725490196, 0.396078431372549, 0.8627450980392157],
                colorSpace: 'srgb',
              },
              'color.purple.800': {
                alpha: 1,
                channels: [0.36470588235294116, 0.07450980392156863, 0.7176470588235294],
                colorSpace: 'srgb',
              },
              'perc.0': 0,
              'perc.100': 1,
              gradient: [
                {
                  color: {
                    alpha: 1,
                    channels: [0.00784313725490196, 0.396078431372549, 0.8627450980392157],
                    colorSpace: 'srgb',
                  },
                  position: 0,
                },
                {
                  color: {
                    alpha: 1,
                    channels: [0.36470588235294116, 0.07450980392156863, 0.7176470588235294],
                    colorSpace: 'srgb',
                  },
                  position: 1,
                },
              ],
            },
          },
        },
      ],
      [
        'invalid: bad syntax',
        {
          given: { alias: { $value: '{foo.bar' } },
          want: {
            error: `Invalid alias: "{foo.bar"

  1 | {
  2 |   "alias": {
> 3 |     "$value": "{foo.bar"
    |               ^
  4 |   }
  5 | }`,
          },
        },
      ],
      [
        'invalid: Gradient (bad syntax)',
        {
          given: {
            gradient: {
              $type: 'gradient',
              $value: [{ color: '{color.blue.500', position: '{perc.0}' }],
            },
          },
          want: {
            error: `Invalid alias: "{color.blue.500"

  4 |     "$value": [
  5 |       {
> 6 |         "color": "{color.blue.500",
    |                  ^
  7 |         "position": "{perc.0}"
  8 |       }
  9 |     ]`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.1 Color', () => {
    const tests: Test[] = [
      [
        'valid: color()',
        {
          given: { color: { cobalt: { $type: 'color', $value: 'color(srgb 0.3 0.6 1)' } } },
          want: { tokens: { 'color.cobalt': { alpha: 1, channels: [0.3, 0.6, 1], colorSpace: 'srgb' } } },
        },
      ],
      [
        'invalid: empty string',
        {
          given: { color: { $type: 'color', $value: '' } },
          want: {
            error: `Expected color, received empty string

  2 |   "color": {
  3 |     "$type": "color",
> 4 |     "$value": ""
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: number',
        {
          given: { color: { $type: 'color', $value: 0x000000 } },
          want: {
            error: `Expected string, received Number

  2 |   "color": {
  3 |     "$type": "color",
> 4 |     "$value": 0
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.2 Dimension', () => {
    const tests: Test[] = [
      [
        'valid: rem',
        {
          given: { xs: { $type: 'dimension', $value: '0.5rem' } },
          want: { tokens: { xs: '0.5rem' } },
        },
      ],
      [
        'valid: px',
        {
          given: { xs: { $type: 'dimension', $value: '12px' } },
          want: { tokens: { xs: '12px' } },
        },
      ],
      [
        'invalid: empty string',
        {
          given: { xs: { $type: 'dimension', $value: '' } },
          want: {
            error: `Expected dimension, received empty string

  2 |   "xs": {
  3 |     "$type": "dimension",
> 4 |     "$value": ""
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: no number',
        {
          given: { xs: { $type: 'dimension', $value: 'rem' } },
          want: {
            error: `Expected dimension with units, received "rem"

  2 |   "xs": {
  3 |     "$type": "dimension",
> 4 |     "$value": "rem"
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: no units',
        {
          given: { xs: { $type: 'dimension', $value: '16' } },
          want: {
            error: `Missing units

  2 |   "xs": {
  3 |     "$type": "dimension",
> 4 |     "$value": "16"
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: number',
        {
          given: { xs: { $type: 'dimension', $value: 42 } },
          want: {
            error: `Expected string, received Number

  2 |   "xs": {
  3 |     "$type": "dimension",
> 4 |     "$value": 42
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'valid: 0',
        {
          given: { '00': { $type: 'dimension', $value: 0 } },
          want: { tokens: { '00': 0 } },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.3 Font Family', () => {
    const tests: Test[] = [
      [
        'valid: string',
        {
          given: { base: { $type: 'fontFamily', $value: 'Helvetica' } },
          want: { tokens: { base: ['Helvetica'] } },
        },
      ],
      [
        'valid: string[]',
        {
          given: { base: { $type: 'fontFamily', $value: ['Helvetica', 'system-ui', 'sans-serif'] } },
          want: { tokens: { base: ['Helvetica', 'system-ui', 'sans-serif'] } },
        },
      ],
      [
        'invalid: empty string',
        {
          given: { base: { $type: 'fontFamily', $value: '' } },
          want: {
            error: `Expected font family name, received empty string

  2 |   "base": {
  3 |     "$type": "fontFamily",
> 4 |     "$value": ""
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: empty string in array',
        {
          given: { base: { $type: 'fontFamily', $value: [''] } },
          want: {
            error: `Expected an array of strings, received some non-strings or empty strings

  2 |   "base": {
  3 |     "$type": "fontFamily",
> 4 |     "$value": [
    |               ^
  5 |       ""
  6 |     ]
  7 |   }`,
          },
        },
      ],
      [
        'invalid: number',
        {
          given: { base: { $type: 'fontFamily', $value: 200 } },
          want: {
            error: `Expected string or array of strings, received Number

  2 |   "base": {
  3 |     "$type": "fontFamily",
> 4 |     "$value": 200
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.4 Font Weight', () => {
    const tests: Test[] = [
      [
        'valid: number',
        {
          given: { bold: { $type: 'fontWeight', $value: 700 } },
          want: { tokens: { bold: 700 } },
        },
      ],
      [
        'valid: weight name',
        {
          given: {
            fontWeight: {
              $type: 'fontWeight',
              thin: { $value: 'thin' },
              hairline: { $value: 'hairline' },
              'extra-light': { $value: 'extra-light' },
              'ultra-light': { $value: 'ultra-light' },
              light: { $value: 'light' },
              normal: { $value: 'normal' },
              regular: { $value: 'regular' },
              book: { $value: 'book' },
              medium: { $value: 'medium' },
              'semi-bold': { $value: 'semi-bold' },
              'demi-bold': { $value: 'demi-bold' },
              bold: { $value: 'bold' },
              'extra-bold': { $value: 'extra-bold' },
              'ultra-bold': { $value: 'ultra-bold' },
              black: { $value: 'black' },
              heavy: { $value: 'heavy' },
              'extra-black': { $value: 'extra-black' },
              'ultra-black': { $value: 'ultra-black' },
            },
          },
          want: {
            tokens: {
              'fontWeight.thin': 100,
              'fontWeight.hairline': 100,
              'fontWeight.extra-light': 200,
              'fontWeight.ultra-light': 200,
              'fontWeight.light': 300,
              'fontWeight.normal': 400,
              'fontWeight.regular': 400,
              'fontWeight.book': 400,
              'fontWeight.medium': 500,
              'fontWeight.semi-bold': 600,
              'fontWeight.demi-bold': 600,
              'fontWeight.bold': 700,
              'fontWeight.extra-bold': 800,
              'fontWeight.ultra-bold': 800,
              'fontWeight.black': 900,
              'fontWeight.heavy': 900,
              'fontWeight.extra-black': 950,
              'fontWeight.ultra-black': 950,
            },
          },
        },
      ],
      [
        'invalid: unknown string',
        {
          given: { thinnish: { $type: 'fontWeight', $value: 'thinnish' } },
          want: {
            error: `Unknown font weight "thinnish". Expected one of: thin, hairline, extra-light, ultra-light, light, normal, regular, book, medium, semi-bold, demi-bold, bold, extra-bold, ultra-bold, black, heavy, extra-black, or ultra-black.

  2 |   "thinnish": {
  3 |     "$type": "fontWeight",
> 4 |     "$value": "thinnish"
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: number out of range',
        {
          given: { kakarot: { $type: 'fontWeight', $value: 9001 } },
          want: {
            error: `Expected number 0–1000, received 9001

  2 |   "kakarot": {
  3 |     "$type": "fontWeight",
> 4 |     "$value": 9001
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.5 Duration', () => {
    const tests: Test[] = [
      [
        'valid: ms',
        {
          given: { quick: { $type: 'duration', $value: '100ms' } },
          want: { tokens: { quick: '100ms' } },
        },
      ],
      [
        'valid: s',
        {
          given: { moderate: { $type: 'duration', $value: '0.25s' } },
          want: { tokens: { moderate: '0.25s' } },
        },
      ],
      [
        'invalid: empty string',
        {
          given: { moderate: { $type: 'duration', $value: '' } },
          want: {
            error: `Expected duration, received empty string

  2 |   "moderate": {
  3 |     "$type": "duration",
> 4 |     "$value": ""
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: no number',
        {
          given: { moderate: { $type: 'duration', $value: 'ms' } },
          want: {
            error: `Expected duration in \`ms\` or \`s\`, received "ms"

  2 |   "moderate": {
  3 |     "$type": "duration",
> 4 |     "$value": "ms"
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: no units',
        {
          given: { moderate: { $type: 'duration', $value: '250' } },
          want: {
            error: `Missing unit "ms" or "s"

  2 |   "moderate": {
  3 |     "$type": "duration",
> 4 |     "$value": "250"
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: number',
        {
          given: { moderate: { $type: 'duration', $value: 250 } },
          want: {
            error: `Expected string, received Number

  2 |   "moderate": {
  3 |     "$type": "duration",
> 4 |     "$value": 250
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'valid: 0',
        {
          given: { '00': { $type: 'dimension', $value: 0 } },
          want: { tokens: { '00': 0 } },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.6 Cubic Bézier', () => {
    const tests: Test[] = [
      [
        'valid',
        {
          given: { cubic: { $type: 'cubicBezier', $value: [0.33, 1, 0.68, 1] } },
          want: { tokens: { cubic: [0.33, 1, 0.68, 1] } },
        },
      ],
      [
        'valid: aliases',
        {
          given: {
            cubic: { $type: 'cubicBezier', $value: ['{number.a}', '{number.b}', '{number.c}', '{number.d}'] },
            number: { $type: 'number', a: { $value: 0.33 }, b: { $value: 1 }, c: { $value: 0.68 }, d: { $value: 1 } },
          },
          want: {
            tokens: {
              cubic: [0.33, 1, 0.68, 1],
              'number.a': 0.33,
              'number.b': 1,
              'number.c': 0.68,
              'number.d': 1,
            },
          },
        },
      ],
      [
        'invalid: length',
        {
          given: { cubic: { $type: 'cubicBezier', $value: [0.33, 1, 0.68, 1, 5] } },
          want: {
            error: `Expected an array of 4 numbers, received 5

  2 |   "cubic": {
  3 |     "$type": "cubicBezier",
> 4 |     "$value": [
    |               ^
  5 |       0.33,
  6 |       1,
  7 |       0.68,`,
          },
        },
      ],
      [
        'invalid: type',
        {
          given: { cubic: { $type: 'cubicBezier', $value: ['33%', '100%', '68%', '100%'] } },
          want: {
            error: `Expected an array of 4 numbers, received some non-numbers

  2 |   "cubic": {
  3 |     "$type": "cubicBezier",
> 4 |     "$value": [
    |               ^
  5 |       "33%",
  6 |       "100%",
  7 |       "68%",`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.7 Number', () => {
    const tests: Test[] = [
      [
        'valid',
        {
          given: { number: { $type: 'number', $value: 42 } },
          want: { tokens: { number: 42 } },
        },
      ],
      [
        'invalid',
        {
          given: { number: { $type: 'number', $value: '100' } },
          want: {
            error: `Expected number, received String

  2 |   "number": {
  3 |     "$type": "number",
> 4 |     "$value": "100"
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: type',
        {
          given: { cubic: { $type: 'cubicBezier', $value: ['33%', '100%', '68%', '100%'] } },
          want: {
            error: `Expected an array of 4 numbers, received some non-numbers

  2 |   "cubic": {
  3 |     "$type": "cubicBezier",
> 4 |     "$value": [
    |               ^
  5 |       "33%",
  6 |       "100%",
  7 |       "68%",`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.? Boolean', () => {
    const tests: Test[] = [
      [
        'valid: true',
        {
          given: { myBool: { $type: 'boolean', $value: true } },
          want: { tokens: { myBool: true } },
        },
      ],
      [
        'valid: false',
        {
          given: { myBool: { $type: 'boolean', $value: false } },
          want: { tokens: { myBool: false } },
        },
      ],
      [
        'invalid: string',
        {
          given: { myBool: { $type: 'boolean', $value: 'true' } },
          want: {
            error: `Expected boolean, received String

  2 |   "myBool": {
  3 |     "$type": "boolean",
> 4 |     "$value": "true"
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: binary',
        {
          given: { myBool: { $type: 'boolean', $value: 0 } },
          want: {
            error: `Expected boolean, received Number

  2 |   "myBool": {
  3 |     "$type": "boolean",
> 4 |     "$value": 0
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.? Link', () => {
    const tests: Test[] = [
      [
        'valid',
        {
          given: { iconStar: { $type: 'link', $value: '/assets/icons/star.svg' } },
          want: { tokens: { iconStar: '/assets/icons/star.svg' } },
        },
      ],
      [
        'invalid: empty string',
        {
          given: { iconStar: { $type: 'link', $value: '' } },
          want: {
            error: `Expected URL, received empty string

  2 |   "iconStar": {
  3 |     "$type": "link",
> 4 |     "$value": ""
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: number',
        {
          given: { iconStar: { $type: 'link', $value: 100 } },
          want: {
            error: `Expected string, received Number

  2 |   "iconStar": {
  3 |     "$type": "link",
> 4 |     "$value": 100
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('8.? String', () => {
    const tests: Test[] = [
      [
        'valid',
        {
          given: { myString: { $type: 'string', $value: 'foobar' } },
          want: { tokens: { myString: 'foobar' } },
        },
      ],
      [
        'valid: empty string',
        {
          given: { myString: { $type: 'string', $value: '' } },
          want: { tokens: { myString: '' } },
        },
      ],
      [
        'invalid: number',
        {
          given: { myString: { $type: 'string', $value: 99 } },
          want: {
            error: `Expected string, received Number

  2 |   "myString": {
  3 |     "$type": "string",
> 4 |     "$value": 99
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('9.2 Stroke Style', () => {
    const tests: Test[] = [
      [
        'valid: string',
        {
          given: { borderStyle: { $type: 'strokeStyle', $value: 'double' } },
          want: { tokens: { borderStyle: 'double' } },
        },
      ],
      [
        'valid: object',
        {
          given: {
            borderStyle: {
              $type: 'strokeStyle',
              $value: { lineCap: 'square', dashArray: ['0.25rem', '0.5rem'] },
            },
          },
          want: { tokens: { borderStyle: { lineCap: 'square', dashArray: ['0.25rem', '0.5rem'] } } },
        },
      ],
      [
        'invalid: unknown string',
        {
          given: { borderStyle: { $type: 'strokeStyle', $value: 'thicc' } },
          want: {
            error: `Unknown stroke style "thicc". Expected one of: solid, dashed, dotted, double, groove, ridge, outset, or inset.

  2 |   "borderStyle": {
  3 |     "$type": "strokeStyle",
> 4 |     "$value": "thicc"
    |               ^
  5 |   }
  6 | }`,
          },
        },
      ],
      [
        'invalid: bad dashArray',
        {
          given: {
            borderStyle: {
              $type: 'strokeStyle',
              $value: { lineCap: 'round', dashArray: [300, 500] },
            },
          },
          want: {
            error: `Expected array of strings, recieved some non-strings or empty strings.

   5 |       "lineCap": "round",
   6 |       "dashArray": [
>  7 |         300,
     |         ^
   8 |         500
   9 |       ]
  10 |     }`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('9.3 Border', () => {
    const tests: Test[] = [
      [
        'valid',
        {
          given: { border: { $type: 'border', $value: { color: '#00000020', style: 'solid', width: '1px' } } },
          want: {
            tokens: {
              border: {
                color: { alpha: 0.12549019607843137, channels: [0, 0, 0], colorSpace: 'srgb' },
                style: 'solid',
                width: '1px',
              },
            },
          },
        },
      ],
      [
        'invalid: missing color',
        {
          given: { border: { $type: 'border', $value: { style: 'solid', width: '1px' } } },
          want: {
            error: `Missing required property "color"

  2 |   "border": {
  3 |     "$type": "border",
> 4 |     "$value": {
    |               ^
  5 |       "style": "solid",
  6 |       "width": "1px"
  7 |     }`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('9.4 Transition', () => {
    const tests: Test[] = [
      [
        'valid',
        {
          given: {
            transition: {
              'ease-in-out': {
                $type: 'transition',
                $value: { duration: '{timing.quick}', timingFunction: '{ease.in-out}', delay: '0ms' },
              },
            },
            timing: {
              $type: 'duration',
              quick: { $value: '150ms' },
            },
            ease: {
              $type: 'cubicBezier',
              'in-out': { $value: [0.42, 0, 0.58, 1] },
            },
          },
          want: {
            tokens: {
              'transition.ease-in-out': { duration: '150ms', timingFunction: [0.42, 0, 0.58, 1], delay: '0ms' },
              'timing.quick': '150ms',
              'ease.in-out': [0.42, 0, 0.58, 1],
            },
          },
        },
      ],
      [
        'valid: optional delay',
        {
          given: {
            transition: {
              'ease-in-out': {
                $type: 'transition',
                $value: { duration: '{timing.quick}', timingFunction: '{ease.in-out}' },
              },
            },
            timing: {
              $type: 'duration',
              quick: { $value: '150ms' },
            },
            ease: {
              $type: 'cubicBezier',
              'in-out': { $value: [0.42, 0, 0.58, 1] },
            },
          },
          want: {
            tokens: {
              'transition.ease-in-out': { duration: '150ms', timingFunction: [0.42, 0, 0.58, 1], delay: 0 },
              'timing.quick': '150ms',
              'ease.in-out': [0.42, 0, 0.58, 1],
            },
          },
        },
      ],
      [
        'invalid: missing duration',
        {
          given: {
            transition: {
              'ease-in-out': {
                $type: 'transition',
                $value: { timingFunction: [0.42, 0, 0.58, 1] },
              },
            },
          },
          want: {
            error: `Missing required property "duration"

  3 |     "ease-in-out": {
  4 |       "$type": "transition",
> 5 |       "$value": {
    |                 ^
  6 |         "timingFunction": [
  7 |           0.42,
  8 |           0,`,
          },
        },
      ],
      [
        'invalid: missing timingFunction',
        {
          given: {
            transition: {
              'ease-in-out': {
                $type: 'transition',
                $value: { duration: '150ms' },
              },
            },
          },
          want: {
            error: `Missing required property "timingFunction"

  3 |     "ease-in-out": {
  4 |       "$type": "transition",
> 5 |       "$value": {
    |                 ^
  6 |         "duration": "150ms"
  7 |       }
  8 |     }`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('9.5 Shadow', () => {
    const tests: Test[] = [
      [
        'valid: single',
        {
          given: {
            shadowBase: {
              $type: 'shadow',
              $value: { color: '#000000', offsetX: 0, offsetY: '0.25rem', blur: '0.5rem' },
            },
          },
          want: { tokens: { shadowBase: [{ color: '#000000', offsetX: 0, offsetY: '0.25rem', blur: '0.5rem' }] } },
        },
      ],
      [
        'valid: array',
        {
          given: {
            shadowBase: {
              $type: 'shadow',
              $value: [
                { color: '#00000020', offsetX: 0, offsetY: '0.25rem', blur: '0.5rem', spread: 0 },
                { color: '#00000020', offsetX: 0, offsetY: '0.5rem', blur: '1rem', spread: 0 },
              ],
            },
          },
          want: {
            tokens: {
              shadowBase: [
                { color: '#00000020', offsetX: 0, offsetY: '0.25rem', blur: '0.5rem', spread: 0 },
                { color: '#00000020', offsetX: 0, offsetY: '0.5rem', blur: '1rem', spread: 0 },
              ],
            },
          },
        },
      ],
      [
        'invalid: missing color',
        {
          given: {
            shadowBase: {
              $type: 'shadow',
              $value: { offsetX: 0, offsetY: '0.25rem', blur: '0.5rem' },
            },
          },
          want: {
            error: `Missing required property "color"

  2 |   "shadowBase": {
  3 |     "$type": "shadow",
> 4 |     "$value": {
    |               ^
  5 |       "offsetX": 0,
  6 |       "offsetY": "0.25rem",
  7 |       "blur": "0.5rem"`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });

  describe('9.6 Gradient', () => {
    const tests: Test[] = [
      [
        'valid',
        {
          given: {
            gradient: {
              $type: 'gradient',
              $value: [
                { color: '#663399', position: 0 },
                { color: '#ff9900', position: 1 },
              ],
            },
          },
          want: {
            tokens: {
              gradient: [
                { color: { alpha: 1, channels: [0.4, 0.2, 0.6], colorSpace: 'srgb' }, position: 0 },
                { color: { alpha: 1, channels: [1, 0.6, 0], colorSpace: 'srgb' }, position: 1 },
              ],
            },
          },
        },
      ],
      [
        'invalid: bad color',
        {
          given: {
            gradient: {
              $type: 'gradient',
              $value: [
                { color: 'foo', position: 0 },
                { color: '#ff9900', position: 1 },
              ],
            },
          },
          want: {
            error: `Unable to parse color "foo"

> 1 | {
  2 |   "gradient": {
  3 |     "$type": "gradient",
  4 |     "$value": [`,
          },
        },
      ],
      [
        'invalid: bad position',
        {
          given: {
            gradient: {
              $type: 'gradient',
              $value: [
                { color: 'foo', position: 0 },
                { color: '#ff9900', position: '12px' },
              ],
            },
          },
          want: {
            error: `Expected number, received String

   9 |       {
  10 |         "color": "#ff9900",
> 11 |         "position": "12px"
     |                     ^
  12 |       }
  13 |     ]
  14 |   }`,
          },
        },
      ],
      [
        'invalid: missing position',
        {
          given: {
            gradient: {
              $type: 'gradient',
              $value: [{ color: 'foo', position: 0 }, { color: '#ff9900' }],
            },
          },
          want: {
            error: `Missing required property "position"

   7 |         "position": 0
   8 |       },
>  9 |       {
     |       ^
  10 |         "color": "#ff9900"
  11 |       }
  12 |     ]`,
          },
        },
      ],
    ];

    it.each(tests)('%s', (_, testCase) => runTest(testCase));
  });
});

describe('Additional cases', () => {
  it('JSON: invalid', async () => {
    const config = defineConfig({}, { cwd: new URL(import.meta.url) });
    await expect(parse('{]', { config })).rejects.toThrow('Unexpected token RBracket found. (1:2)');
  });

  it('YAML: invalid', async () => {
    try {
      const config = defineConfig({}, { cwd: new URL(import.meta.url) });
      const result = await parse(
        `tokens:
  - foo: true
  false`,
        { config },
      );
      expect(() => result).toThrow();
    } catch (err) {
      expect(stripAnsi((err as Error).message)).toBe(`parse:yaml: BAD_INDENT All mapping items must start at the same column

  1 | tokens:
  2 |   - foo: true
> 3 |   false
    |  ^`);
    }
  });

  describe('values', () => {
    const tests: [string, { given: any; want: any }][] = [
      [
        'fontFamily',
        {
          given: {
            fontFamily: {
              $type: 'fontFamily',
              base: { $value: 'Helvetica' },
              sans: { $value: '{fontFamily.base}' },
            },
          },
          want: { 'fontFamily.base': ['Helvetica'], 'fontFamily.sans': ['Helvetica'] },
        },
      ],
    ];

    it.each(tests)('%s', async (_, { given, want }) => {
      const config = defineConfig({}, { cwd: new URL(import.meta.url) });
      const { tokens } = await parse(given, { config });
      for (const id in want) {
        expect(tokens[id]!.$value).toEqual(want[id]);
      }
    });
  });

  describe('groups', () => {
    it('collects all sibling tokens', async () => {
      const json = {
        color: {
          $type: 'color',
          blue: {
            $description: 'Blue palette',
            $extensions: { foo: 'bar' },
            '7': {
              $value: '#8ec8f6',
              $extensions: { mode: { light: '#8ec8f6', dark: '#205d9e' } },
            },
            '8': {
              $value: '#5eb1ef',
              $extensions: { mode: { light: '#5eb1ef', dark: '#2870bd' } },
            },
            '9': {
              $value: '#0090ff',
              $extensions: { mode: { light: '#0090ff', dark: '#0090ff' } },
            },
            '10': {
              $value: '#0588f0',
              $extensions: { mode: { light: '#0588f0', dark: '#3b9eff' } },
            },
          },
        },
        border: {
          $type: 'border',
        },
      };
      const config = defineConfig({}, { cwd: new URL(import.meta.url) });
      const { tokens } = await parse(JSON.stringify(json), { config });
      expect(tokens['color.blue.7']!.group).toEqual({
        id: 'color.blue',
        $type: 'color',
        $description: 'Blue palette',
        $extensions: { foo: 'bar' },
        tokens: ['color.blue.7', 'color.blue.8', 'color.blue.9', 'color.blue.10'],
      });
    });
  });

  describe('modes', () => {
    const tests: [string, { given: any; want: any }][] = [
      [
        'color',
        {
          given: {
            color: {
              $type: 'color',
              semantic: {
                bg: {
                  $value: '{color.blue.7}',
                  $extensions: { mode: { light: '{color.blue.7#light}', dark: '{color.blue.7#dark}' } },
                },
              },
              blue: {
                '7': { $value: '#8ec8f6', $extensions: { mode: { light: '#8ec8f6', dark: '#205d9e' } } },
              },
            },
          },
          want: {
            'color.blue.7': {
              '.': {
                id: 'color.blue.7',
                $type: 'color',
                $value: {
                  alpha: 1,
                  channels: [0.5568627450980392, 0.7843137254901961, 0.9647058823529412],
                  colorSpace: 'srgb',
                },
              },
              light: {
                id: 'color.blue.7',
                $type: 'color',
                $value: {
                  alpha: 1,
                  channels: [0.5568627450980392, 0.7843137254901961, 0.9647058823529412],
                  colorSpace: 'srgb',
                },
              },
              dark: {
                id: 'color.blue.7',
                $type: 'color',
                $value: {
                  alpha: 1,
                  channels: [0.12549019607843137, 0.36470588235294116, 0.6196078431372549],
                  colorSpace: 'srgb',
                },
              },
            },
            'color.semantic.bg': {
              '.': {
                id: 'color.semantic.bg',
                $type: 'color',
                aliasOf: 'color.blue.7',
                $value: {
                  alpha: 1,
                  channels: [0.5568627450980392, 0.7843137254901961, 0.9647058823529412],
                  colorSpace: 'srgb',
                },
              },
              light: {
                id: 'color.semantic.bg',
                $type: 'color',
                aliasOf: 'color.blue.7',
                $value: {
                  alpha: 1,
                  channels: [0.5568627450980392, 0.7843137254901961, 0.9647058823529412],
                  colorSpace: 'srgb',
                },
              },
              dark: {
                id: 'color.semantic.bg',
                $type: 'color',
                aliasOf: 'color.blue.7',
                $value: {
                  alpha: 1,
                  channels: [0.12549019607843137, 0.36470588235294116, 0.6196078431372549],
                  colorSpace: 'srgb',
                },
              },
            },
          },
        },
      ],
    ];

    it.each(tests)('%s', async (_, { given, want }) => {
      const config = defineConfig({}, { cwd: new URL(import.meta.url) });
      const { tokens } = await parse(given, { config });
      for (const id in want) {
        for (const mode in want[id]!) {
          const { sourceNode, ...modeValue } = tokens[id]!.mode[mode]!;
          expect(sourceNode).not.toBeFalsy();
          expect(modeValue).toEqual(want[id][mode]);
        }
      }
    });
  });
});
