import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import nodePolyfills from 'rollup-plugin-node-polyfills';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'esm',
      name: 'dlc-btc-lib',
      sourcemap: true,
    },
  ],
  plugins: [resolve(), typescript({ tsconfig: './tsconfig.json' }), commonjs(), nodePolyfills()],
};
