export function speak(text, lang, gender) {
    if (!SpeechSynthesisUtterance)
        return false;

    switch (lang) {
    case 'en':
        lang = 'en-us';
        break;
    case 'ja':
        lang = 'ja-jp';
        break;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    if (/(iPhone|iPad|iPod)(?=.*OS [7-8])/.test(navigator.userAgent))
        utterance.rate = 0.2;
    const voices = speechSynthesis.getVoices().filter(e => e.lang.toLowerCase() === lang);
    let voice = null;
    if (voices.length > 1) {
        let names = null;
        switch (lang) {
        case 'ja-jp':
            switch (gender) {
            case 'male':
                names = ['Otoya', 'Hattori', 'Ichiro'];
                break;
            case 'female':
                names = ['O-ren（拡張）', 'O-ren', 'Kyoko', 'Haruka']; // Windows 10のAyumiの声は今ひとつ
                break;
            }
            break;
        case 'en-us':
            switch (gender) {
            case 'male':
                names = ['Alex', 'Fred'];
                break;
            case 'female':
                names = ['Samantha', 'Victoria'];
                break;
            }
            break;
        }
        if (names) {
            voice = voices.filter(v => names.some(n => v.name.indexOf(n) >= 0))[0];
        }
        if (!voice) {
            voice = voices.filter(v => v.gender && v.gender.toLowerCase() === gender)[0];
        }
    }
    utterance.voice = voice || voices[0];
    // iOS 10 Safari has a bug that utterance.voice is no effect.
    utterance.volume = parseFloat(localStorage.getItem('volume') || '1.0');
    speechSynthesis.speak(utterance);
    return true;
}
