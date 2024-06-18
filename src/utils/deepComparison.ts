export const  deepComparison = (obj1, obj2) => {
  // Si les deux objets sont strictement égaux, retourner true
  if (obj1 === obj2) return true;

  // Si l'un des objets est null ou non un objet, retourner false
  if (obj1 == null || typeof obj1 !== 'object' ||
    obj2 == null || typeof obj2 !== 'object') return false;

  // Récupérer les clés des deux objets
  let keys1 = Object.keys(obj1);
  let keys2 = Object.keys(obj2);

  // Si les objets ont un nombre de clés différent, retourner false
  if (keys1.length !== keys2.length) return false;

  // Comparer chaque clé et valeur des deux objets
  for (let key of keys1) {
    if (!keys2.includes(key) || !deepComparison(obj1[key], obj2[key])) {
      return false;
    }
  }

  // Si toutes les clés et valeurs sont égales, retourner true
  return true;
}