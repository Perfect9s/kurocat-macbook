// Hardware-free checks for the actual callback ABI, coordinate conversion and click attribution.
#include "../src-tauri/native/trackpad.c"
#include <assert.h>
int main(void) {
    device = CFSTR("fixture");
    accepting = true;
    Contact contacts[2] = {
        {.path = 8, .state = 4, .normalized.position = {.25f, .75f}},
        {.path = 2, .state = 3, .normalized.position = {.75f, .25f}}
    };
    PadPoint output[16];
    on_frame(device, contacts, 2, 0, 0);
    assert(kc_pad_snapshot(output) == 2 && !kc_pad_click(output));
    on_frame(device, contacts, 1, 0, 1);
    assert(kc_pad_click(output) && output[0].x == .25f && output[0].y == .25f && output[0].id == 8);
    on_frame(device, NULL, 0, 0, 2);
    assert(kc_pad_snapshot(output) == 0 && kc_pad_click(output));
    single_until = millis();
    assert(!kc_pad_click(output));
    contacts[0].normalized.position.x = NAN;
    on_frame(device, contacts, 1, 0, 3);
    assert(kc_pad_snapshot(output) == 0);
}
