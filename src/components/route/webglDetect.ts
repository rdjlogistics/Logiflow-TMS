/**
 * Check if WebGL is available AND actually capable of rendering.
 * Multiple detection layers:
 * 1. Create context + render a pixel + read it back
 * 2. Check for RENDERER string indicating software/swiftshader fallback
 * 3. Catch the Chromium "deprecated software WebGL" scenario
 */

let _cachedResult: boolean | null = null;

export function isWebGLAvailable(): boolean {
  if (_cachedResult !== null) return _cachedResult;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const gl =
      (canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true }) as WebGL2RenderingContext | null) ||
      (canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true }) as WebGLRenderingContext | null);

    if (!gl) {
      // Try again without failIfMajorPerformanceCaveat — if this succeeds
      // it means hardware is missing but software fallback exists.
      // We still reject it because Mapbox won't render properly.
      _cachedResult = false;
      return false;
    }

    // Check for software renderer / SwiftShader
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      if (/swiftshader|software|llvmpipe|mesa/i.test(renderer)) {
        _cachedResult = false;
        return false;
      }
    }

    // Actually render a pixel and read it back
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const pixels = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // If the red channel came back, rendering works
    _cachedResult = pixels[0] > 200;
    return _cachedResult;
  } catch {
    _cachedResult = false;
    return false;
  }
}
