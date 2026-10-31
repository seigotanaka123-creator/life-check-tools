// Freeze the work itself, but reframe it when the phone rotates or resizes.
export function createOutdoorWorkCamera() {
 let previous = null, held = null;
 const frame = input => {
  const side = input.panelHeight > input.height * .7 && input.panelWidth < input.width * .6;
  const result = {
   focus: {...input.focus}, yaw: input.yaw, pitch: input.pitch, distance: input.distance,
   width: input.width, height: input.height,
   offsetX: side ? input.panelWidth * .5 : 0,
   offsetY: side ? 0 : input.panelHeight * .5
  };
  result.key = JSON.stringify(result);
  return result;
 };
 return {
  resolve(input) {
   if (!input.working) { held = null; previous = frame(input); return previous; }
   held ??= previous ?? frame(input);
   if (held.width !== input.width || held.height !== input.height) {
    held = frame({...input, focus: held.focus, yaw: held.yaw, pitch: held.pitch});
   }
   return held;
  }
 };
}
