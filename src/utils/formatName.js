export function formatName(username) {
  if (!username) return '';
  return username.charAt(0).toUpperCase() + username.slice(1);
}
