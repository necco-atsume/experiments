import { MappedFlag, MappedNumber } from "./synth";

type Expected = { address: number, expected: number, val: number };

const fixture = (...values: Expected[]) => {
    return {
        read: (addr: number) => {
            const loc = values.find(a => a.address === addr);
            expect(loc).not.toBeFalsy();
            return loc!.val;
        },

        write: (addr: number, val: number) => {
            const loc = values.find(a => a.address === addr);
            expect(loc).not.toBeFalsy();
            expect(val.toString(2)).toBe(loc!.expected.toString(2));

            loc!.val = val;
        },

        bits: () => 0,
    };
};

it("round trips flags", () => {
    const regs = fixture({ address: 0x42, expected: 0b10101010, val: 0b10101000 });

    const flag = new MappedFlag(regs, 0x42, 1);

    expect(flag.get()).toBe(false);
    flag.set(true);
    expect(flag.get()).toBe(true);
});

it("round trips flags (unset)", () => {
    const regs = fixture({ address: 0x42, expected: 0b10101000, val: 0b10101010 });

    const flag = new MappedFlag(regs, 0x42, 1);

    expect(flag.get()).toBe(true);
    flag.set(false);
    expect(flag.get()).toBe(false);
});

it("round trips singlebyte", () => {
    // 01/10_10/01 => (01/1011/01)
    const regs = fixture({ address: 0x42, expected: 0x6D, val: 0x69 });

    const val = new MappedNumber(regs, {address: 0x42, start: 2, end: 5});

    expect(val.get()).toBe(0x0A);
    val.set(0x0B);
    expect(val.get()).toBe(0x0B);
});

it("round trips singlebyte (inv)", () => {
    const regs = fixture({ address: 0x42, expected: 0b0011_1100, val: 0b0010_0000 });

    const val = new MappedNumber(regs, {address: 0x42, start: 2, end: 5});

    expect(val.get()).toBe(0b10_00);
    val.set(0b1111);
    expect(val.get()).toBe(0b1111);
    expect(regs.read(0x42)).toBe(0b0011_1100);
});

it("round trips doublebyte", () => {
    const regs = fixture({ address: 0x42, expected: 0b1111_1100, val: 0b1111_0000 }, { address: 0x46, expected: 0b1101_1000, val: 0b1111_0000});

    const val = new MappedNumber(regs, { address: 0x42, start: 2, end: 5 }, { address: 0x46, start: 2, end: 5 });

    expect(val.get()).toBe(0b1100_1100);
    val.set(0b0110_1111);
    expect(val.get()).toBe(0b0110_1111);
});