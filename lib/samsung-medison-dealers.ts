export type Dealer = {
  key: string
  company: string
  rep: string
  phone: string
  email: string
}

export const DEALERS: Record<string, Dealer> = {
  yubi:      { key: 'yubi',      company: '유비케어',     rep: '김상우 팀장',   phone: '010-2065-2058', email: 'xiangyou@medison.co.kr' },
  sailmed:   { key: 'sailmed',   company: '세일메드',     rep: '유명진 사장',   phone: '010-8377-2194', email: 'sonamurl@naver.com' },
  humanmed:  { key: 'humanmed',  company: '휴먼메디',     rep: '강태원 사장',   phone: '010-6234-9312', email: 'ktw@medison.co.kr' },
  pnk:       { key: 'pnk',       company: '피앤케이메디', rep: '김진두 사장',   phone: '010-2351-1818', email: 'kkm6112@medison.co.kr' },
  withus:    { key: 'withus',    company: '위더스케어',   rep: '이종욱 부사장', phone: '010-8796-2109', email: 'jongwook.lee@withuscare.com' },
  plusmed:   { key: 'plusmed',   company: '플러스메디',   rep: '신호철 사장',   phone: '010-4523-0602', email: 'hochulshin@medison.co.kr' },
  jmed:      { key: 'jmed',      company: '제이메디칼',   rep: '정재우 사장',   phone: '010-2559-5321', email: 'medical1018@naver.com' },
  ssonoline: { key: 'ssonoline', company: '에스소노라인', rep: '최현석 사장',   phone: '010-6308-5550', email: 'hschoi@medison.co.kr' },
  gaon:      { key: 'gaon',      company: '가온헬스케어', rep: '장형옥 사장',   phone: '010-2230-2212', email: 'jang.gaon@medison.co.kr' },
  sansung:   { key: 'sansung',   company: '산성헬스케어', rep: '박재영 사장',   phone: '',              email: 'ssm2565@naver.com' },
  smsupply:  { key: 'smsupply',  company: '에스엠서플라이', rep: '조성필 사장', phone: '010-8794-9925', email: 'spil.cho@medison.co.kr' },
}

export type DistrictEntry = { name: string; dealer: string | null }

export type ProvinceEntry =
  | { name: string; dealer: string }               // 단일 대리점 직접 매칭
  | { name: string; dealer: null }                  // 담당 대리점 없음
  | { name: string; districts: DistrictEntry[] }    // 구/시 선택 필요

export const PROVINCE_LIST: ProvinceEntry[] = [
  {
    name: '서울특별시',
    districts: [
      { name: '강남구',   dealer: 'yubi' },
      { name: '강동구',   dealer: 'yubi' },
      { name: '강서구',   dealer: 'yubi' },
      { name: '관악구',   dealer: 'yubi' },
      { name: '동작구',   dealer: 'yubi' },
      { name: '서초구',   dealer: 'yubi' },
      { name: '송파구',   dealer: 'yubi' },
      { name: '양천구',   dealer: 'yubi' },
      { name: '영등포구', dealer: 'yubi' },
      { name: '광진구',   dealer: 'sailmed' },
      { name: '노원구',   dealer: 'sailmed' },
      { name: '도봉구',   dealer: 'sailmed' },
      { name: '성동구',   dealer: 'sailmed' },
      { name: '강북구',   dealer: 'sailmed' },
      { name: '중랑구',   dealer: 'sailmed' },
      { name: '동대문구', dealer: 'humanmed' },
      { name: '마포구',   dealer: 'humanmed' },
      { name: '서대문구', dealer: 'humanmed' },
      { name: '성북구',   dealer: 'humanmed' },
      { name: '용산구',   dealer: 'humanmed' },
      { name: '은평구',   dealer: 'humanmed' },
      { name: '종로구',   dealer: 'humanmed' },
      { name: '중구',     dealer: 'humanmed' },
      { name: '구로구',   dealer: 'withus' },
      { name: '금천구',   dealer: 'withus' },
    ],
  },
  {
    name: '경기도',
    districts: [
      { name: '과천시',   dealer: 'yubi' },
      { name: '안양시',   dealer: 'yubi' },
      { name: '하남시',   dealer: 'yubi' },
      { name: '가평군',   dealer: 'sailmed' },
      { name: '구리시',   dealer: 'sailmed' },
      { name: '남양주시', dealer: 'sailmed' },
      { name: '동두천시', dealer: 'sailmed' },
      { name: '양주시',   dealer: 'sailmed' },
      { name: '양평군',   dealer: 'sailmed' },
      { name: '연천군',   dealer: 'sailmed' },
      { name: '의정부시', dealer: 'sailmed' },
      { name: '포천시',   dealer: 'sailmed' },
      { name: '고양시(일산)', dealer: 'humanmed' },
      { name: '파주시',   dealer: 'humanmed' },
      { name: '광주시',   dealer: 'pnk' },
      { name: '성남시(분당)', dealer: 'pnk' },
      { name: '수원시',   dealer: 'pnk' },
      { name: '안산시',   dealer: 'pnk' },
      { name: '안성시',   dealer: 'pnk' },
      { name: '여주시',   dealer: 'pnk' },
      { name: '오산시',   dealer: 'pnk' },
      { name: '용인시',   dealer: 'pnk' },
      { name: '이천시',   dealer: 'pnk' },
      { name: '평택시',   dealer: 'pnk' },
      { name: '화성시',   dealer: 'pnk' },
      { name: '광명시',   dealer: 'withus' },
      { name: '군포시',   dealer: 'withus' },
      { name: '김포시',   dealer: 'withus' },
      { name: '부천시',   dealer: 'withus' },
      { name: '시흥시',   dealer: 'withus' },
      { name: '의왕시',   dealer: null },
    ],
  },
  {
    name: '인천광역시',
    districts: [
      { name: '계양구',   dealer: 'humanmed' },
      { name: '강화군',   dealer: 'humanmed' },
      { name: '남동구',   dealer: 'humanmed' },
      { name: '동구',     dealer: 'humanmed' },
      { name: '미추홀구', dealer: 'humanmed' },
      { name: '서구',     dealer: 'humanmed' },
      { name: '연수구',   dealer: 'humanmed' },
      { name: '중구',     dealer: 'humanmed' },
      { name: '부평구',   dealer: 'withus' },
      { name: '옹진군',   dealer: null },
    ],
  },
  { name: '강원도',              dealer: 'sailmed' },
  { name: '대전·충남·세종',      dealer: 'gaon' },
  { name: '충청북도',            dealer: null },
  { name: '대구·경상북도',       dealer: 'plusmed' },
  { name: '부산·경상남도·울산',  dealer: 'jmed' },
  { name: '광주·전라남도',       dealer: 'ssonoline' },
  {
    name: '전라북도',
    districts: [
      { name: '전주시', dealer: 'sansung' },
      { name: '기타 지역', dealer: null },
    ],
  },
  { name: '제주도',              dealer: 'smsupply' },
]

/** 성 + 구/시 조합으로 dealer key 반환 */
export function getDealerKey(provinceName: string, districtName?: string): string | null {
  const province = PROVINCE_LIST.find(p => p.name === provinceName)
  if (!province) return null

  if ('dealer' in province) return province.dealer
  if ('districts' in province && districtName) {
    const district = province.districts.find(d => d.name === districtName)
    return district?.dealer ?? null
  }
  return null
}
