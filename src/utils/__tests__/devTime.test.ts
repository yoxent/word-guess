import { withDevTime, withDevTimeAsync } from '../devTime';

describe('withDevTime', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs work between console.time and console.timeEnd', () => {
    const order: string[] = [];
    jest.spyOn(console, 'time').mockImplementation((label?: string) => {
      order.push(`time:${label}`);
    });
    jest.spyOn(console, 'timeEnd').mockImplementation((label?: string) => {
      order.push(`timeEnd:${label}`);
    });

    const result = withDevTime('dictionary-load', () => {
      order.push('work');
      return 42;
    });

    expect(result).toBe(42);
    expect(order).toEqual(['time:dictionary-load', 'work', 'timeEnd:dictionary-load']);
  });

  it('ends the marker when the work throws', () => {
    const order: string[] = [];
    jest.spyOn(console, 'time').mockImplementation((label?: string) => {
      order.push(`time:${label}`);
    });
    jest.spyOn(console, 'timeEnd').mockImplementation((label?: string) => {
      order.push(`timeEnd:${label}`);
    });

    expect(() =>
      withDevTime('stats-read', () => {
        order.push('work');
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(order).toEqual(['time:stats-read', 'work', 'timeEnd:stats-read']);
  });
});

describe('withDevTimeAsync', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('runs async work between console.time and console.timeEnd', async () => {
    const order: string[] = [];
    jest.spyOn(console, 'time').mockImplementation((label?: string) => {
      order.push(`time:${label}`);
    });
    jest.spyOn(console, 'timeEnd').mockImplementation((label?: string) => {
      order.push(`timeEnd:${label}`);
    });

    const result = await withDevTimeAsync('stats-write', async () => {
      order.push('work');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(order).toEqual(['time:stats-write', 'work', 'timeEnd:stats-write']);
  });
});
