import { Institution } from '../types/education';

export const institutions: Institution[] = [
    {
        id: 'sunway',
        name: 'Sunway College',
        location: 'Sunway City, Selangor',
        campuses: ['Sunway City', 'Johor Bahru', 'Kuala Lumpur'],
        logourl: '/assets/logos/sunway.png',
        applyUrl: 'https://www.sunway.edu.my/college/admissions/application-form'
    },
    {
        id: 'taylors',
        name: "Taylor's College",
        location: 'Subang Jaya, Selangor',
        campuses: ['Subang Jaya', 'Kuala Lumpur', 'Penang'],
        logourl: '/assets/logos/taylors.png',
        applyUrl: 'https://www.taylors.edu.my/en/admissions/how-to-apply.html'
    },
    {
        id: 'monash',
        name: 'Monash University Malaysia',
        location: 'Sunway City, Selangor',
        campuses: ['Sunway City'],
        logourl: '/assets/logos/monash.png',
        applyUrl: 'https://www.monash.edu.my/admissions/apply-now'
    },
    {
        id: 'apu',
        name: 'Asia Pacific University (APU)',
        location: 'Bukit Jalil, Kuala Lumpur',
        campuses: ['Kuala Lumpur', 'Penang'],
        logourl: '/assets/logos/apu.png',
        applyUrl: 'https://www.apu.edu.my/admissions/how-to-apply/'
    },
    {
        id: 'mmu',
        name: 'Multimedia University (MMU)',
        location: 'Cyberjaya, Selangor',
        campuses: ['Cyberjaya', 'Melaka', 'Johor'],
        logourl: '/assets/logos/mmu.png',
        applyUrl: 'https://www.mmu.edu.my/admissions/application-form'
    },
    {
        id: 'nottingham',
        name: 'University of Nottingham Malaysia',
        location: 'Semenyih, Selangor',
        campuses: ['Semenyih'],
        logourl: '/assets/logos/nottingham.png',
        applyUrl: 'https://www.nottingham.edu.my/admissions/how-to-apply.aspx'
    },
    {
        id: 'inti',
        name: 'INTI International University',
        location: 'Nilai, Negeri Sembilan',
        campuses: ['Nilai', 'Subang', 'Penang'],
        logourl: '/assets/logos/inti.png',
        applyUrl: 'https://www.inti.edu.my/admissions/application-process/'
    },
    {
        id: 'tarumt',
        name: 'Tunku Abdul Rahman University of Management and Technology (TAR UMT)',
        location: 'Setapak, Kuala Lumpur',
        campuses: ['Kuala Lumpur', 'Perak', 'Penang', 'Johor'],
        logourl: '/assets/logos/tarumt.png',
        applyUrl: 'https://www.tarc.edu.my/admissions/application-form'
    },
    {
        id: 'ucsi',
        name: 'UCSI University',
        location: 'Cheras, Kuala Lumpur',
        campuses: ['Kuala Lumpur', 'Sarawak', 'Terengganu'],
        logourl: '/assets/logos/ucsi.png',
        applyUrl: 'https://www.ucsiuniversity.edu.my/admissions/how-to-apply/'
    },
    {
        id: 'help',
        name: 'HELP University',
        location: 'Damansara Heights, Kuala Lumpur',
        campuses: ['Kuala Lumpur'],
        logourl: '/assets/logos/help.png',
        applyUrl: 'https://www.help.edu.my/admissions/application-process/'
    }
];
