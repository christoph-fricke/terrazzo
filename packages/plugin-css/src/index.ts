import type { Plugin, Token } from '@terrazzo/parser';
import { isTokenMatch, makeAlias } from '@terrazzo/token-tools';
import {
  makeCSSVar,
  transformBooleanValue,
  transformBorderValue,
  transformColorValue,
  transformCubicBezierValue,
  transformDimensionValue,
  transformDurationValue,
  transformFontFamilyValue,
  transformFontWeightValue,
  transformGradientValue,
  transformLinkValue,
  transformNumberValue,
  transformStringValue,
  transformStrokeStyleValue,
  transformTransitionValue,
  transformTypographyValue,
} from '@terrazzo/token-tools/css';

export interface ModeSelector {
  /** The name of the mode to match */
  mode: string;
  /** (optional) Provide token IDs to match. Globs are allowed (e.g: `["color.*", "shadow.dark"]`) */
  tokens?: string[];
  /** Provide CSS selectors to generate. (e.g.: `["@media (prefers-color-scheme: dark)", "[data-color-theme='dark']"]` ) */
  selectors: string[];
}

export interface CSSPluginOptions {
  /** Where to output CSS */
  filename?: string;
  /** Glob patterns to exclude tokens from output */
  exclude?: string[];
  /** Define mode selectors as media queries or CSS classes */
  modeSelectors?: ModeSelector[];
  /** Control the final CSS variable name */
  variableName?: (name: string) => string;
}

export const FORMAT_ID = 'css';

export const FILE_PREFIX = `/* -------------------------------------------
 *  Autogenerated by 💠 Terrazzo. DO NOT EDIT!
 * ------------------------------------------- */`;

export const CONTEXTS_BY_TYPE: Record<Extract<Token['$type'], 'color'>, string[] | undefined> = {
  color: ['srgb', 'p3'],
};

export default function cssPlugin({ filename = './index.css', exclude, variableName }: CSSPluginOptions = {}): Plugin {
  const transformName = (id: string) => variableName?.(id) || makeCSSVar(id);
  const transformAlias = (id: string) => `var(${transformName(id)})`;

  return {
    name: '@terrazzo/plugin-css',
    async transform({ tokens, setTransform }) {
      for (const id in tokens) {
        if (!Object.hasOwn(tokens, id)) {
          continue;
        }
        const token = tokens[id]!;
        const localID = transformName(id);

        if (token.aliasOf) {
          setTransform(id, { format: FORMAT_ID, localID, value: transformAlias(makeAlias(token.aliasOf)) });
          continue;
        }

        switch (token.$type) {
          case 'boolean': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformBooleanValue(currentMode.$value, { transformAlias }),
                mode,
              });
            }
            break;
          }
          case 'border': {
            for (const mode in token.mode) {
              const baseValue = { format: FORMAT_ID, mode };
              const currentMode = token.mode[mode]!;
              const value = currentMode.$value;
              if (currentMode.partialAliasOf) {
                for (const property in value) {
                  // @ts-expect-error satisfying TS causes too much indirection here, but this is safe
                  if (currentMode.partialAliasOf?.[property]) {
                    // @ts-expect-error satisfying TS causes too much indirection here, but this is safe
                    value[property] = makeAlias(currentMode.partialAliasOf[property]);
                  }
                }
              }
              const output = transformBorderValue(value, { transformAlias });
              if (typeof output === 'string') {
                setTransform(id, { ...baseValue, localID, value: output });
              } else {
                const { width, color, style } = output;
                setTransform(id, {
                  ...baseValue,
                  localID,
                  value: [
                    transformAlias(`${localID}-width}`),
                    transformAlias(`${localID}-color}`),
                    transformAlias(`${localID}-style}`),
                  ].join(' '),
                });
                setTransform(id, { ...baseValue, localID: `${localID}-width`, value: width });
                setTransform(id, { ...baseValue, localID: `${localID}-color`, value: color });
                setTransform(id, { ...baseValue, localID: `${localID}-style`, value: style });
              }
            }
            break;
          }
          case 'color': {
            for (const mode in token.mode) {
              const baseValue = { format: FORMAT_ID, localID, mode };
              const currentMode = token.mode[mode]!;
              const srgb = transformColorValue(currentMode.$value, { transformAlias, gamut: 'srgb' });
              const p3 = transformColorValue(currentMode.$value, { transformAlias, gamut: 'p3' });
              setTransform(id, { ...baseValue, value: srgb, variant: 'srgb' });
              setTransform(id, { ...baseValue, value: p3, variant: 'p3' });
            }
            break;
          }
          case 'cubicBezier': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              const value = [...currentMode.$value].map((v, i) =>
                currentMode.partialAliasOf?.[i] ? currentMode.partialAliasOf[i]! : v,
              ) as typeof currentMode.$value;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformCubicBezierValue(value, { transformAlias }),
                mode,
              });
            }
            break;
          }
          case 'dimension': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformDimensionValue(currentMode.$value, { transformAlias }),
                mode,
              });
            }
            break;
          }
          case 'duration': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformDurationValue(currentMode.$value, { transformAlias }),
                mode,
              });
            }
            break;
          }
          case 'fontFamily': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformFontFamilyValue(
                  currentMode.$value.map(
                    (fontName, i) =>
                      currentMode.partialAliasOf?.[i] ? makeAlias(currentMode.partialAliasOf[i]) : fontName,
                    { transformAlias },
                  ),
                ),
                mode,
              });
            }
            break;
          }
          case 'fontWeight': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformFontWeightValue(currentMode.$value, { transformAlias }),
                mode,
              });
            }
            break;
          }
          case 'gradient': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformGradientValue(
                  currentMode.$value.map(({ color, position }, i) => ({
                    color: currentMode.partialAliasOf?.[i]?.color
                      ? makeAlias(currentMode.partialAliasOf![i]!.color!)
                      : color,
                    position,
                  })),
                  { transformAlias },
                ),
              });
            }
            break;
          }
          case 'link': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformLinkValue(currentMode.$value, { transformAlias }),
                mode,
              });
            }
            break;
          }
          case 'number': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformNumberValue(currentMode.$value, { transformAlias }),
                mode,
              });
            }
            break;
          }
          case 'string': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformStringValue(currentMode.$value, { transformAlias }),
                mode,
              });
            }
            break;
          }
          case 'strokeStyle': {
            for (const mode in token.mode) {
              const currentMode = token.mode[mode]!;
              setTransform(id, {
                format: FORMAT_ID,
                localID,
                value: transformStrokeStyleValue(currentMode.$value, { transformAlias }),
                mode,
              });
            }
            break;
          }
          case 'transition': {
            for (const mode in token.mode) {
              const baseValue = { format: FORMAT_ID, mode };
              const currentMode = token.mode[mode]!;
              const value = { ...currentMode.$value } as typeof currentMode.$value;
              for (const property in value) {
                // @ts-expect-error satisfying TS causes too much indirection here, but this is safe
                if (currentMode.partialAliasOf?.[property]) {
                  // @ts-expect-error satisfying TS causes too much indirection here, but this is safe
                  value[property] = makeAlias(currentMode.partialAliasOf[property]!);
                }
              }
              const output = transformTransitionValue(value, { transformAlias });
              if (typeof output === 'string') {
                setTransform(id, { ...baseValue, localID, value: output });
              } else {
                const { duration, delay, timingFunction } = output;
                setTransform(id, {
                  ...baseValue,
                  localID,
                  value: [
                    transformAlias(`${localID}-duration}`),
                    transformAlias(`${localID}-delay}`),
                    transformAlias(`${localID}-timingFunction}`),
                  ].join(' '),
                });
                setTransform(id, { ...baseValue, localID: `${localID}-duration`, value: duration });
                setTransform(id, { ...baseValue, localID: `${localID}-delay`, value: delay });
                setTransform(id, { ...baseValue, localID: `${localID}-timingFunction`, value: timingFunction });
              }
            }
            break;
          }
          case 'typography': {
            for (const mode in token.mode) {
              const baseValue = { format: FORMAT_ID, mode };
              const currentMode = token.mode[mode]!;
              const value: Record<string, string> = { ...currentMode.$value };
              for (const [property, subvalue] of Object.entries(value)) {
                value[property] = currentMode.partialAliasOf?.[property]
                  ? makeAlias(currentMode.partialAliasOf[property]!)
                  : subvalue;
              }
              const output = transformTypographyValue(value, { transformAlias });
              if (typeof output === 'string') {
                setTransform(id, { ...baseValue, localID, value: output });
              } else {
                for (const property in output) {
                  setTransform(id, { ...baseValue, localID: `${localID}-${property}`, value: output[property]! });
                }
              }
            }
            break;
          }
        }
      }
    },
    async build({ getTransforms, outputFile }) {
      const output: string[] = [FILE_PREFIX, ''];

      // :root
      output.push(':root {');
      const rootTokens = getTransforms({ format: 'css', mode: '.' });
      for (const token of rootTokens) {
        if (isTokenMatch(token.token.id, exclude ?? [])) {
          continue;
        }
        const localID = token.localID ?? token.token.id;
        if (token.type === 'SINGLE_VALUE') {
          if (!token.variant || token.variant === 'srgb') {
            output.push(`  ${localID}: ${token.value};`);
          }
        } else if (token.type === 'MULTI_VALUE') {
          for (const [name, value] of Object.entries(token.value)) {
            output.push(`  ${localID}-${name}: ${value};`);
          }
        }
      }
      output.push('}');

      // P3
      const p3Tokens = getTransforms({ format: 'css', mode: '.', variant: 'p3' });
      if (p3Tokens.length) {
        output.push('@supports (color(display-p3 0 0 0)) {');
        for (const token of p3Tokens) {
          const localID = token.localID ?? token.token.id;
          output.push(`  ${localID}: ${token.value};`);
        }
        output.push('}');
      }

      outputFile(filename, output.join('\n'));
    },
  };
}
