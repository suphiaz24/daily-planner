/**
 * Run these from the editor. Results show in the Execution log.
 * test_computeFreeBlocks needs no Calendar access; test_freeTimeToday reads your real calendar.
 */

function test_computeFreeBlocks() {
  const t = function (hhmm) { return atTime_(new Date(2026, 9, 19), hhmm).getTime(); };
  const opts = { bufferMs: 15 * MIN_MS, minBlockMs: 20 * MIN_MS };
  const show = function (blocks) {
    return blocks.map(function (b) { return formatTime_(new Date(b.start)) + '-' + formatTime_(new Date(b.end)); }).join(', ');
  };

  const cases = [
    {
      name: 'empty day = whole window',
      busy: [],
      expect: '08:00-23:00',
    },
    {
      name: 'walk buffer after class',
      busy: [{ start: t('10:10'), end: t('11:00') }],
      expect: '08:00-10:10, 11:15-23:00',
    },
    {
      name: 'overlapping events merge',
      busy: [{ start: t('09:00'), end: t('10:00') }, { start: t('09:30'), end: t('11:00') }],
      expect: '08:00-09:00, 11:15-23:00',
    },
    {
      name: 'gap shorter than 20 min is dropped',
      busy: [{ start: t('09:00'), end: t('10:00') }, { start: t('10:30'), end: t('11:00') }],
      expect: '08:00-09:00, 11:15-23:00',
    },
    {
      name: 'event running past the window',
      busy: [{ start: t('07:00'), end: t('08:30') }, { start: t('22:30'), end: t('23:59') }],
      expect: '08:45-22:30',
    },
  ];

  let failed = 0;
  cases.forEach(function (c) {
    const got = show(computeFreeBlocks(c.busy, t('08:00'), t('23:00'), opts));
    if (got === c.expect) {
      console.log('PASS ' + c.name);
    } else {
      failed++;
      console.error('FAIL ' + c.name + '\n  expected: ' + c.expect + '\n  got:      ' + got);
    }
  });
  console.log(failed ? failed + ' failed' : 'All passed');
}

function test_freeTimeToday() {
  console.log(JSON.stringify(findFreeBlocks(), null, 2));
}
