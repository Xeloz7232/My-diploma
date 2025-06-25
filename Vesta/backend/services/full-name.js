function getFullName(person) {
  if (!person) return "";
  return [person.surname, person.name, person.patronymic]
    .filter(Boolean)
    .join(" ");
}

function formatName(fullName) {
  if (typeof fullName !== 'string') return '';
  const parts = fullName.trim().split(/\s+/);

  if (parts.length < 2) {
    return fullName.trim();
  }

  const [surname, name, patronymic] = parts;
  const initialName = name.charAt(0).toUpperCase() + '.';
  const initialPatronymic = patronymic
    ? '' + patronymic.charAt(0).toUpperCase() + '.'
    : '';

  return `${initialName}${initialPatronymic} ${surname}`;
}

module.exports = { getFullName, formatName };
