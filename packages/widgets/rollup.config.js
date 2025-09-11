import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/embed.ts',
  output: [
    {
      file: 'dist/embed.js',
      format: 'umd',
      name: 'BizBox',
      sourcemap: !production
    },
    {
      file: 'dist/embed.min.js',
      format: 'umd',
      name: 'BizBox',
      plugins: [terser()]
    }
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: !production
    }),
    postcss({
      extract: true,
      minimize: production,
      sourceMap: !production
    }),
    production && terser()
  ].filter(Boolean)
};