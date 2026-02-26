const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const TENS = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

const toWordsBelow1000 = (num) => {
  let n = num;
  const parts = [];

  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} hundred`);
    n %= 100;
  }

  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)]);
    n %= 10;
  }

  if (n > 0) {
    parts.push(ONES[n]);
  }

  if (parts.length === 0) {
    return ONES[0];
  }

  return parts.join(' ');
};

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export default function numberToWordsNpr(amount) {
  const rounded = Math.max(0, Math.floor(Number(amount) || 0));

  if (rounded === 0) {
    return 'Zero rupees only';
  }

  const thousands = Math.floor(rounded / 1000);
  const remainder = rounded % 1000;

  const parts = [];

  if (thousands > 0) {
    parts.push(`${toWordsBelow1000(thousands)} thousand`);
  }

  if (remainder > 0) {
    parts.push(toWordsBelow1000(remainder));
  }

  return `${capitalize(parts.join(' '))} rupees only`;
}
