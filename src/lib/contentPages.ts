export const pageSlugs = ['contact', 'delivery', 'returns', 'faqs', 'our-story', 'guides', 'privacy', 'terms'] as const
export type PageSlug = typeof pageSlugs[number]
type SectionBrief = { heading: string; bodyHint: string; bulletsHint: string }
type PageBrief = { title: string; group: 'Help' | 'About'; introductionHint: string; layoutHint: string; sectionName: string; sections: SectionBrief[] }
const section = (heading: string, bodyHint: string, bulletsHint = 'Optional supporting points, one per line.') => ({ heading, bodyHint, bulletsHint })

// These are editorial instructions, not published business facts. The API remains
// the sole source of copy; starter headings are added only by an explicit action.
export const pageBriefs: Record<PageSlug, PageBrief> = {
  contact: {
    title: 'Contact Us', group: 'Help', sectionName: 'Contact note',
    introductionHint: 'Welcome customers and explain the kinds of enquiries your team can help with.',
    layoutHint: 'Contact details sit beside the enquiry form. These notes appear below them; phone numbers, address and hours are edited in Storefront → Contact details.',
    sections: [section('Order enquiries', 'Explain what information a customer should include about an order. Do not request payment details.', 'Useful information to include, such as an order reference.'), section('Other questions', 'Explain how to ask about products or the shop.')],
  },
  delivery: {
    title: 'Delivery', group: 'Help', sectionName: 'Delivery topic',
    introductionHint: 'Introduce your delivery information without making promises that have not been approved.',
    layoutHint: 'Each topic becomes a delivery information card. Customers can jump directly to a topic. Keep prices and thresholds consistent with the checkout delivery rules.',
    sections: [section('Delivery areas', 'List the regions you actually serve and any restrictions.', 'Regions served or excluded.'), section('Delivery charges', 'Enter the approved delivery prices and explain when they apply.', 'Approved options and their charges.'), section('Free delivery', 'State the actual qualifying threshold and any exclusions.'), section('Dispatch and delivery times', 'Explain dispatch days, cut-off times and expected transit times, if confirmed.', 'Confirmed timings or exceptions.')],
  },
  returns: {
    title: 'Returns', group: 'Help', sectionName: 'Returns topic',
    introductionHint: 'Briefly explain where customers can find the returns rules and how to ask for help.',
    layoutHint: 'Topics form a vertical, numbered walkthrough. Points within each topic are numbered too, making return instructions easy to follow.',
    sections: [section('Returns summary', 'Enter the approved eligibility, time limits and refund information.'), section('Exclusions', 'Explain any lawful exclusions or product-condition requirements. Have the policy reviewed.', 'One exclusion or requirement per line.'), section('How to request a return', 'Explain how customers should contact you to begin a return.', 'Put each step on its own line, in the order customers should follow.')],
  },
  faqs: {
    title: 'FAQs', group: 'Help', sectionName: 'Supporting note',
    introductionHint: 'Introduce the questions customers can find answers to here.',
    layoutHint: 'Each question becomes a keyboard-accessible accordion. Customers can search the answers. Use the dedicated question editor, not page sections, for FAQs.',
    sections: [],
  },
  'our-story': {
    title: 'Our Story', group: 'About', sectionName: 'Story chapter',
    introductionHint: 'Introduce the real people or purpose behind My Pet Food, in your own voice.',
    layoutHint: 'The first chapter is the lead story in a spacious editorial layout. Later chapters become supporting story and values cards. Reordering changes which chapter leads.',
    sections: [section('How we began', 'Tell the true story of how the business started. Include only confirmed names, dates and experiences.'), section('What matters to us', 'Explain your values and what they mean in practice.', 'Specific values or everyday commitments.'), section('Our community', 'Describe your real connection with customers, pets or the local area.')],
  },
  guides: {
    title: 'Pet Care Guides', group: 'About', sectionName: 'Care guide',
    introductionHint: 'Explain what these guides cover. Avoid presenting general care information as veterinary advice.',
    layoutHint: 'One section is one complete guide. Guides appear in your chosen order, with a browsable index and search. There are no separate article pages.',
    sections: [section('Dog care', 'Write an approved, complete dog-care guide. Include when to seek professional advice.', 'Practical tips, one per line.'), section('Cat care', 'Write an approved, complete cat-care guide.', 'Practical tips, one per line.'), section('Bird care', 'Write an approved, complete bird-care guide.', 'Practical tips, one per line.')],
  },
  privacy: {
    title: 'Privacy Policy', group: 'About', sectionName: 'Policy clause',
    introductionHint: 'Introduce the approved privacy notice and identify its scope. Do not publish sample legal wording.',
    layoutHint: 'Clauses appear in a readable document with a linked contents list. Ask the responsible person to approve all legal wording before publishing.',
    sections: [section('Who we are', 'Identify the actual data controller and appropriate contact details.'), section('Information we collect', 'Describe only data that this business actually collects.'), section('How we use information', 'Explain the approved purposes and legal bases for processing.'), section('Sharing and retention', 'Describe actual recipients, retention periods and safeguards.'), section('Your rights and choices', 'Explain applicable rights and how to exercise them.'), section('Contact and complaints', 'Add approved contact and complaint information.')],
  },
  terms: {
    title: 'Terms and Conditions', group: 'About', sectionName: 'Terms clause',
    introductionHint: 'Introduce the approved terms for shopping with this business.',
    layoutHint: 'Clauses appear as a numbered, navigable document. Use business-approved legal text, not the example headings as a substitute for a policy.',
    sections: [section('About these terms', 'Identify the business and the scope of these terms.'), section('Orders and payment', 'Describe the actual order process, payment rules and contract formation.'), section('Prices and product information', 'Enter the approved pricing and product-information terms.'), section('Delivery', 'Enter approved delivery terms consistent with checkout and the Delivery page.'), section('Returns and cancellations', 'Enter approved terms consistent with the Returns page and applicable rights.'), section('Questions and disputes', 'Explain the approved contact and dispute process.')],
  },
}

export function isPageSlug(value: string | null | undefined): value is PageSlug {
  return pageSlugs.some(slug => slug === value)
}

export function validUkPhone(number: string) {
  if (!/^[+0-9() -]+$/.test(number) || number.includes('()')) return false
  const open = number.indexOf('('), close = number.indexOf(')')
  if (open !== number.lastIndexOf('(') || close !== number.lastIndexOf(')') || (open < 0) !== (close < 0) || open > close) return false
  return /^(?:0[1-9]\d{9}|\+44[1-9]\d{9})$/.test(number.replace(/[() -]/g, ''))
}

export function plainTextError(values: string[]) {
  return values.some(value => /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(value))
    ? 'Use plain text only: remove HTML angle brackets and non-text control characters.' : ''
}
