from transform import (
    institution_type,
    name_case,
    norm_hospital,
    parse_opening_hours,
    provider_label,
    slugify,
    title_hr,
    town_from_name,
)


def test_parse_opening_hours_weekday_range():
    assert parse_opening_hours("Mo-Fr 07:00-14:00") == [(d, "07:00", "14:00") for d in range(1, 6)]


def test_parse_opening_hours_multiple_rules_and_off():
    out = parse_opening_hours("Mo,We 08:00-12:00,16:00-19:00; Sa 8:00-12:00; Su off")
    assert (1, "08:00", "12:00") in out
    assert (3, "16:00", "19:00") in out
    assert (6, "08:00", "12:00") in out
    assert not any(d == 7 for d, _, _ in out)


def test_parse_opening_hours_24_7():
    assert len(parse_opening_hours("24/7")) == 7


def test_parse_opening_hours_unknown_syntax_returns_empty():
    assert parse_opening_hours("by appointment") == []
    assert parse_opening_hours("Mo-Fr 07:00-14:00; PH 09:00-10:00 'note'") == []


def test_title_hr_keeps_generic_words_lowercase():
    assert title_hr('KLINIČKA BOLNICA "SVETI DUH"') == 'Klinička bolnica "Sveti Duh"'
    assert title_hr("VINOGRADSKA CESTA 29") == "Vinogradska cesta 29"
    assert title_hr("OPĆA BOLNICA DR.JOSIP BENČEVIĆ") == "Opća bolnica dr. Josip Benčević"


def test_name_case_handles_compound_names():
    assert name_case("TURČIĆ KAJMAK") == "Turčić Kajmak"
    assert name_case("ANA-MARIJA") == "Ana-Marija"


def test_provider_label():
    assert provider_label("O.DZ Dubrovnik lok.Gruda-stom.", "DZ") == "Dom zdravlja Dubrovnik"
    assert "koncesija" in provider_label("P.O. X", "konces")


def test_institution_type():
    assert institution_type("KLINIČKI BOLNIČKI CENTAR SPLIT") == "KBC"
    assert institution_type("KLINIČKA  BOLNICA DUBRAVA") == "KB"
    assert institution_type("OPĆA ŽUPANIJSKA BOLNICA POŽEGA") == "OB"
    assert institution_type("LJEČILIŠTE TOPUSKO") == "specijalna_bolnica"


def test_norm_hospital_matches_variants():
    assert norm_hospital('KLINIČKA BOLNICA "DUBRAVA"') == norm_hospital("Klinička bolnica Dubrava")


def test_slugify():
    assert slugify("Hitna medicina (OHBP)") == "hitna-medicina-ohbp"
    assert slugify("Dermatologija i venerologija") == "dermatologija-i-venerologija"
    assert slugify("Đakovo") == "djakovo"


def test_town_from_name():
    towns = {"Pakrac", "Požega", "Osijek", "Zabok", "Knin", "Nova Gradiška", "Slavonski Brod"}
    assert town_from_name("Opća županijska bolnica Požega-lokacija Pakrac", towns) == "Pakrac"
    assert town_from_name("Opća bolnica Zabok", towns) == "Zabok"
    assert town_from_name("Opća bolnica Varaždin - Klenovnik", towns | {"Varaždin"}) == "Klenovnik"
    assert town_from_name("Magdalena klinika … Sveučilišta u Osijeku", towns) == "Osijek"
    assert (
        town_from_name(
            "Opća bolnica dr. Josip Benčević Slavonski Brod Lokacija Nova Gradiška", towns
        )
        == "Nova Gradiška"
    )
