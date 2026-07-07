(function () {
  var codes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  var displayNames = window.Intl && window.Intl.DisplayNames
    ? new window.Intl.DisplayNames(['en'], { type: 'region' })
    : null;

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function normalize(value) {
    var country = String(value || '').trim().toUpperCase();
    var legacy = { USA: 'US', UNITEDSTATES: 'US', UK: 'GB', ENGLAND: 'GB' };
    var normalized = legacy[country.replace(/[^A-Z]/g, '')] || country;
    return codes.indexOf(normalized) === -1 ? '' : normalized;
  }

  function flag(code) {
    code = normalize(code);
    if (!code) return '';
    return code.replace(/[A-Z]/g, function (char) {
      return String.fromCodePoint(127397 + char.charCodeAt(0));
    });
  }

  function label(code) {
    code = normalize(code);
    if (!code) return '';
    return flag(code) + ' ' + (displayNames ? displayNames.of(code) : code);
  }

  function selectHtml(value, name) {
    var selected = normalize(value);
    return '<select name="' + escapeHtml(name || 'country') + '">' +
      '<option value="">Country</option>' +
      codes.map(function (code) {
        return '<option value="' + code + '"' + (code === selected ? ' selected' : '') + '>' + escapeHtml(label(code)) + '</option>';
      }).join('') +
    '</select>';
  }

  window.BikeFreeCountries = {
    normalize: normalize,
    flag: flag,
    label: label,
    selectHtml: selectHtml
  };
})();
