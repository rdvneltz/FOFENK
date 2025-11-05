// Telefon numarası formatlaması: 0 (5xx) xxx xx xx

export const formatPhoneNumber = (value) => {
  // Sadece rakamları al
  const numbers = value.replace(/\D/g, '');

  // Maksimum 11 karakter (05xxxxxxxxx)
  const limited = numbers.slice(0, 11);

  // Formatla
  if (limited.length === 0) return '';
  if (limited.length <= 1) return limited;
  if (limited.length <= 4) return `${limited.slice(0, 1)} (${limited.slice(1)}`;
  if (limited.length <= 7) return `${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4)}`;
  if (limited.length <= 9) return `${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)} ${limited.slice(7)}`;

  return `${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)} ${limited.slice(7, 9)} ${limited.slice(9)}`;
};

export const unformatPhoneNumber = (value) => {
  // Sadece rakamları döndür
  return value.replace(/\D/g, '');
};

export const validatePhoneNumber = (value) => {
  const numbers = unformatPhoneNumber(value);
  // Türk telefon numarası: 0 ile başlamalı, 11 haneli, 2. rakam 5 olmalı
  if (numbers.length === 0) return true; // Boş geçilebilir
  if (numbers.length !== 11) return false;
  if (numbers[0] !== '0') return false;
  if (numbers[1] !== '5') return false;
  return true;
};
