const POSTCODE_SCRIPT_ID = 'daum-postcode-script';
const POSTCODE_SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

export const loadPostcodeScript = () => {
  if (window.daum?.Postcode) {
    return Promise.resolve();
  }

  const existing = document.getElementById(POSTCODE_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = POSTCODE_SCRIPT_ID;
    script.src = POSTCODE_SCRIPT_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

const normalizePostcodeData = (data) => {
  return {
    postalCode: data.zonecode,
    address: data.roadAddress || data.jibunAddress,
    roadAddress: data.roadAddress,
    jibunAddress: data.jibunAddress
  };
};

export const openPostcodeSearch = async (onComplete) => {
  await loadPostcodeScript();

  new window.daum.Postcode({
    oncomplete(data) {
      onComplete(normalizePostcodeData(data));
    }
  }).open();
};

export const embedPostcodeSearch = async (container, onComplete) => {
  await loadPostcodeScript();

  container.innerHTML = '';

  new window.daum.Postcode({
    width: '100%',
    height: '100%',
    oncomplete(data) {
      onComplete(normalizePostcodeData(data));
    }
  }).embed(container);
};
