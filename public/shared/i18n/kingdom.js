// Strings for the Kingdom of Knowledge preview (menu tab and home page card), merged into the
// site's dictionaries. Load after dictionaries.js and before i18n.js.
(function () {
  var add = {
    en: {
      nav: "Kingdom",
      card: {
        eyebrow: "For students · Preview",
        title: "Kingdom of Knowledge",
        desc: "Explore an island and open its gates with Grade 4 math. An early preview of our 3D learning game: it runs right in the browser on phones, tablets and computers.",
        link: "Play the preview"
      }
    },
    fr: {
      nav: "Royaume",
      card: {
        eyebrow: "Pour les élèves · Aperçu",
        title: "Le Royaume du Savoir",
        desc: "Explorez une île et ouvrez ses portes grâce aux mathématiques de CM1. Un premier aperçu de notre jeu d'apprentissage en 3D, en anglais : il fonctionne directement dans le navigateur, sur téléphone, tablette et ordinateur.",
        link: "Jouer à l'aperçu"
      }
    },
    ar: {
      nav: "المملكة",
      card: {
        eyebrow: "للطلاب · معاينة",
        title: "مملكة المعرفة",
        desc: "استكشف جزيرة وافتح بواباتها برياضيات الصف الرابع. معاينة أولى للعبتنا التعليمية ثلاثية الأبعاد باللغة الإنجليزية: تعمل مباشرة في المتصفح على الهواتف والأجهزة اللوحية والحواسيب.",
        link: "العب المعاينة"
      }
    },
    pl: {
      nav: "Królestwo",
      card: {
        eyebrow: "Dla uczniów · Podgląd",
        title: "Królestwo Wiedzy",
        desc: "Odkrywaj wyspę i otwieraj jej bramy dzięki matematyce z klasy 4. Wczesna wersja naszej edukacyjnej gry 3D, po angielsku: działa w przeglądarce na telefonie, tablecie i komputerze.",
        link: "Zagraj w wersję podglądową"
      }
    }
  };
  var dicts = window.I18N_DICTIONARIES;
  if (!dicts) return;
  Object.keys(add).forEach(function (lang) {
    var d = dicts[lang];
    if (!d) return;
    d.hub = d.hub || {};
    d.hub.nav = d.hub.nav || {};
    d.hub.nav.kingdom = add[lang].nav;
    d.hub.card = d.hub.card || {};
    d.hub.card.kingdom = add[lang].card;
  });
})();
