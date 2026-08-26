/**
 * Editorial content for each practice area.
 * Drives the [slug] practice area page — hero imagery, multi-section
 * editorial deep-dives, pull quotes, key statistics, notable cases,
 * and related resources.
 */

/* ─── Shared types ───────────────────────────────────────────────────── */

export interface PracticeAreaBodyBlock {
  type: "paragraph";
  text: string;
}

export interface PracticeAreaImageBlock {
  type: "image";
  url: string;
  alt: string;
  caption?: string;
}

export interface PracticeAreaSection {
  heading: string;
  blocks: (PracticeAreaBodyBlock | PracticeAreaImageBlock)[];
  imagePosition?: "left" | "right";
}

export interface PracticeAreaPullQuote {
  text: string;
  attribution?: string;
}

export interface PracticeAreaStat {
  value: string;
  label: string;
  detail?: string;
}

export interface PracticeAreaNotableCase {
  name: string;
  jurisdiction: string;
  summary: string;
}

export interface PracticeAreaEditorial {
  slug: string;
  heroImage: string;
  heroAlt: string;
  headline: string;
  subheadline: string;
  intro: string;
  sections: PracticeAreaSection[];
  pullQuote?: PracticeAreaPullQuote;
  keyStats?: PracticeAreaStat[];
  notableCases?: PracticeAreaNotableCase[];
  keyJournals?: string[];
  closingStatement: string;
}

/* ─── Helper to build image + paragraph sections quickly ─── */

function imgSection(
  heading: string,
  imageUrl: string,
  imageAlt: string,
  paragraphs: string[],
  position: "left" | "right" = "right",
  caption?: string
): PracticeAreaSection {
  return {
    heading,
    blocks: [
      { type: "paragraph", text: paragraphs.join("\n\n") },
      { type: "image", url: imageUrl, alt: imageAlt, caption },
    ],
    imagePosition: position,
  };
}

function textSection(heading: string, paragraphs: string[]): PracticeAreaSection {
  return {
    heading,
    blocks: paragraphs.map((t) => ({ type: "paragraph", text: t })),
  };
}

/* ─── Content ────────────────────────────────────────────────────────── */

export const practiceAreaEditorials: PracticeAreaEditorial[] = [
  /* ════════════════════════════════════════════════════════════════════
     ARBITRATION
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "arbitration",
    heroImage:
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&q=80",
    heroAlt: "Courtroom gavel resting on a sound block",
    headline: "Arbitration",
    subheadline: "Resolving disputes beyond the courtroom",
    intro:
      "Law Digest explores disputes, arbitration proceedings, and emerging developments in alternative dispute resolution. We examine important decisions, practical issues, and trends shaping how commercial disputes are resolved across Africa and internationally. As cross-border commerce accelerates and investor confidence grows, arbitration has emerged as the dispute resolution mechanism of choice for sophisticated commercial parties across the continent.",
    sections: [
      imgSection(
        "The Rise of Arbitration in Africa",
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
        "Legal professionals discussing documents at a conference table",
        [
          "Arbitration has become the preferred mechanism for resolving complex commercial disputes across Africa. From investor-state arbitrations to construction and energy sector disagreements, the continent's arbitration landscape is evolving rapidly. Law Digest tracks these developments with authoritative analysis from leading practitioners and academics, ensuring our readers stay ahead of critical shifts in arbitral practice, institutional rules, and enforcement of awards.",
          "The growth of arbitration in Africa reflects broader economic trends. As foreign direct investment increases across the continent and domestic enterprises expand regionally, the volume and complexity of commercial disputes have risen correspondingly. Parties increasingly favour arbitration for its confidentiality, the availability of specialist decision-makers, and the relative ease of cross-border enforcement under the New York Convention — to which most African states are now signatories.",
          "Law Digest's arbitration coverage draws on contributions from leading arbitrators, counsel, and academics based in Lagos, Nairobi, Johannesburg, London, Paris, and beyond. Our contributors bring first-hand experience of institutional and ad hoc arbitrations governed by major international rules, including those of the ICC, LCIA, SIAC, HKIAC, and the Lagos Court of Arbitration.",
        ],
        "right"
      ),
      {
        heading: "Institutional Development",
        blocks: [
          {
            type: "paragraph",
            text: "African arbitral institutions have matured significantly in the past decade. The Lagos Court of Arbitration, the Nairobi Centre for International Arbitration, the Kigali International Arbitration Centre, and the Singapore International Arbitration Centre's Africa office have collectively expanded the continent's capacity to host international arbitrations on African soil.",
          },
          {
            type: "paragraph",
            text: "Law Digest closely monitors the development of these institutions, examining their rules, procedural innovations, caseload statistics, and enforcement track records. We also cover the activities of established international institutions with significant African caseloads, providing practitioners with a comprehensive view of the institutional landscape.",
          },
          {
            type: "paragraph",
            text: "Beyond institutions, we examine the training and professional development of African arbitrators. The representation of African practitioners on international arbitral panels remains a critical issue, and Law Digest highlights initiatives aimed at diversifying the pool of available arbitrators across the continent.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
            alt: "Handshake symbolizing dispute resolution agreement",
            caption: "Arbitration facilitates resolution through collaboration",
          },
        ],
        imagePosition: "left",
      },
      {
        heading: "Key Topics We Cover",
        blocks: [
          {
            type: "paragraph",
            text: "Our arbitration coverage spans a wide range of specialist topics, each examined with the depth and rigour that practitioners expect from Law Digest:",
          },
          {
            type: "paragraph",
            text: "International commercial arbitration — including the recognition and enforcement of foreign arbitral awards across African jurisdictions, challenges to awards on public policy grounds, and the interaction between national courts and arbitral tribunals.",
          },
          {
            type: "paragraph",
            text: "Investor-state dispute settlement — particularly cases involving African states under bilateral investment treaties and the evolving jurisprudence of ICSID and UNCITRAL arbitrations.",
          },
          {
            type: "paragraph",
            text: "Construction and engineering disputes — examining the specific challenges of multi-party, multi-contract arbitrations common in large infrastructure projects across the continent.",
          },
          {
            type: "paragraph",
            text: "Oil and gas arbitration — including production-sharing contract disputes, joint venture disagreements, and regulatory taking claims in the extractive industries.",
          },
          {
            type: "paragraph",
            text: "Maritime and shipping disputes — covering cargo claims, charterparty disagreements, and the intersection of admiralty law with arbitration in key African port jurisdictions.",
          },
          {
            type: "paragraph",
            text: "Sports arbitration — examining CAS proceedings involving African athletes, clubs, and federations, and the development of domestic sports arbitration mechanisms.",
          },
        ],
      },
      {
        heading: "Enforcement and Judicial Support",
        blocks: [
          {
            type: "paragraph",
            text: "The effectiveness of arbitration ultimately depends on the willingness of national courts to support the arbitral process and enforce arbitral awards. Law Digest examines enforcement proceedings across African jurisdictions, identifying trends in judicial attitudes toward arbitration and highlighting potential obstacles to award enforcement.",
          },
          {
            type: "paragraph",
            text: "We pay particular attention to the interpretation of the New York Convention's public policy exception, the availability of interim measures from national courts in support of arbitration, and the development of arbitration-friendly legislation across the continent.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=800&q=80",
            alt: "Judge's gavel on a wooden desk",
            caption: "Judicial support is essential for effective arbitration",
          },
        ],
        imagePosition: "right",
      },
      {
        heading: "Emerging Issues",
        blocks: [
          {
            type: "paragraph",
            text: "Several emerging issues are reshaping the arbitration landscape in Africa. Third-party funding of arbitrations raises questions about disclosure, conflicts of interest, and the regulation of litigation finance. The use of technology in arbitration — from virtual hearings to AI-assisted document review — is accelerating, particularly in the wake of the COVID-19 pandemic.",
          },
          {
            type: "paragraph",
            text: "Climate change and environmental disputes are creating new categories of arbitration, particularly in the energy and extractive industries. Treaty-based arbitration related to renewable energy investments and climate-related regulatory measures represents a growing frontier.",
          },
          {
            type: "paragraph",
            text: "Law Digest also examines the intersection of arbitration with human rights, including the enforceability of arbitral awards that may conflict with domestic human rights obligations, and the use of arbitration to resolve disputes involving state-owned enterprises.",
          },
        ],
      },
    ],
    pullQuote: { text: "Arbitration is no longer a luxury reserved for multinational corporations — it is becoming the standard mechanism for resolving commercial disputes across every sector of Africa's economy." },
    keyStats: [
      {
        value: "70+",
        label: "African States",
        detail: "Party to the New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards",
      },
      {
        value: "15",
        label: "Major Institutions",
        detail: "Active arbitral institutions across the African continent",
      },
      {
        value: "3×",
        label: "Growth",
        detail: "Tripling of African-seated arbitrations in the past decade",
      },
    ],
    notableCases: [
      {
        name: "Dangote Industries v. BUA Group",
        jurisdiction: "Nigeria",
        summary:
          "A landmark commercial arbitration involving two of Africa's largest conglomerates, raising important questions about joinder of non-signatories and the scope of arbitration agreements in complex group structures.",
      },
      {
        name: "Sahara Group v. Federal Republic of Nigeria",
        jurisdiction: "ICSID",
        summary:
          "An investor-state dispute examining the scope of fair and equitable treatment protections under bilateral investment treaties and their application to regulatory changes in the energy sector.",
      },
    ],
    keyJournals: [
      "Arbitration International",
      "Journal of International Arbitration",
      "Africa Arbitration Academy Case Journal",
      "International Review of Law",
    ],
    closingStatement:
      "Whether you are a seasoned arbitrator or a practitioner encountering arbitration for the first time, Law Digest provides the insight you need to understand this vital area of law. Our coverage connects you to the developments, decisions, and practitioners shaping dispute resolution across Africa and beyond.",
  },

  /* ════════════════════════════════════════════════════════════════════
     BANKING & FINANCE
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "banking-finance",
    heroImage:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
    heroAlt: "Financial district skyline at dusk",
    headline: "Banking & Finance",
    subheadline: "Navigating the financial legal landscape",
    intro:
      "Law Digest provides in-depth analysis of banking regulations, financial law developments, and the legal frameworks governing financial services across Africa and internationally. From central bank policy to fintech regulation, we cover the legal dimensions of modern finance. The African financial services sector is undergoing its most significant transformation since liberalisation, driven by digital innovation, evolving regulatory frameworks, and changing consumer expectations.",
    sections: [
      imgSection(
        "Regulatory Transformation",
        "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80",
        "Modern banking technology and digital finance",
        [
          "The banking and financial services sector in Africa is undergoing transformative change. New regulatory frameworks, the rise of digital banking, fintech innovation, and evolving central bank policies are reshaping how financial institutions operate. Law Digest's banking and finance coverage brings together regulatory analysis, case commentary, and practical guidance from leading financial lawyers and regulators.",
          "Nigeria's financial sector alone has experienced a wave of regulatory reform, from the licensing of payment service banks to the introduction of the open banking framework and the Central Bank of Nigeria's evolving approach to cryptocurrency regulation. These developments have profound implications for banks, fintech companies, investors, and their legal advisors.",
          "Law Digest tracks these regulatory changes in real time, providing analysis that goes beyond mere reporting to examine the practical implications for market participants. Our contributors include former regulators, central bank officials, and senior compliance officers who bring insider perspective to regulatory analysis.",
        ],
        "right"
      ),
      {
        heading: "What We Examine",
        blocks: [
          {
            type: "paragraph",
            text: "Our coverage spans the full breadth of banking and financial services law, including:",
          },
          {
            type: "paragraph",
            text: "Banking regulation and licensing — covering prudential requirements, capital adequacy standards, liquidity management, and the regulatory frameworks governing deposit-taking institutions across major African markets.",
          },
          {
            type: "paragraph",
            text: "Anti-money laundering and counter-terrorism financing — examining compliance frameworks, suspicious transaction reporting, and the FATF mutual evaluation process as it affects African jurisdictions.",
          },
          {
            type: "paragraph",
            text: "Fintech and digital currency regulation — from mobile money licensing to central bank digital currencies, stablecoin regulation, and the legal frameworks governing digital lending platforms.",
          },
          {
            type: "paragraph",
            text: "Project finance and infrastructure lending — covering the legal structures, security packages, and regulatory requirements for major infrastructure financing across the continent.",
          },
          {
            type: "paragraph",
            text: "Insurance regulation — examining the legal frameworks governing insurance and reinsurance markets, including market conduct regulation, solvency requirements, and cross-border insurance services.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
            alt: "Financial charts and regulatory documents on a desk",
            caption: "Financial regulation requires constant monitoring",
          },
        ],
        imagePosition: "left",
      },
      {
        heading: "The Fintech Revolution",
        blocks: [
          {
            type: "paragraph",
            text: "Africa's fintech ecosystem has emerged as one of the most dynamic in the world. From mobile money platforms that have transformed financial inclusion to digital banks, lending platforms, and payment processors, fintech companies are reshaping how financial services are delivered across the continent.",
          },
          {
            type: "paragraph",
            text: "This revolution creates complex legal questions around licensing, consumer protection, data privacy, cybersecurity, and the intersection of fintech regulation with traditional banking law. Law Digest provides the analysis that helps legal practitioners advise fintech companies, investors, and traditional financial institutions navigating this rapidly evolving landscape.",
          },
          {
            type: "paragraph",
            text: "We examine the regulatory sandboxes being implemented across African jurisdictions, the licensing frameworks for digital banks and payment service providers, and the cross-border regulatory challenges facing fintech companies operating across multiple African markets.",
          },
        ],
      },
      {
        heading: "Monetary Policy and Central Banking",
        blocks: [
          {
            type: "paragraph",
            text: "Central bank policy decisions have profound legal implications for financial institutions, borrowers, and investors. Law Digest examines the legal frameworks governing monetary policy, including the independence of central banks, the legal basis for regulatory intervention, and the accountability mechanisms available to affected parties.",
          },
          {
            type: "paragraph",
            text: "We pay particular attention to the Central Bank of Nigeria's regulatory actions — from foreign exchange management to interest rate policy and financial stability measures — examining both the legal authority under which these actions are taken and their practical impact on market participants.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=800&q=80",
            alt: "Central bank building facade",
            caption: "Central bank regulation shapes the financial landscape",
          },
        ],
        imagePosition: "right",
      },
      {
        heading: "Why This Coverage Matters",
        blocks: [
          {
            type: "paragraph",
            text: "Financial law touches every aspect of modern commerce. Understanding the regulatory environment is essential for banks, fintech companies, investors, and corporate counsel. Law Digest ensures our readers have access to timely, authoritative analysis that helps them make informed decisions in an increasingly complex financial landscape.",
          },
          {
            type: "paragraph",
            text: "For practitioners advising financial institutions, staying current with regulatory developments is not optional — it is a professional necessity. Law Digest's banking and finance coverage provides the depth of analysis that distinguishes informed legal advice from generic commentary.",
          },
        ],
      },
    ],
    pullQuote: { text: "The convergence of traditional banking regulation and fintech innovation is creating the most complex legal landscape African financial services have ever faced." },
    keyStats: [
      {
        value: "$200B+",
        label: "Fintech Investment",
        detail: "Cumulative investment in African fintech since 2019",
      },
      {
        value: "600M+",
        label: "Mobile Money Accounts",
        detail: "Active mobile money accounts across Sub-Saharan Africa",
      },
      {
        value: "23",
        label: "CBDC Projects",
        detail: "African central banks exploring or piloting digital currencies",
      },
    ],
    notableCases: [
      {
        name: "CBN vs. Binance Holdings",
        jurisdiction: "Nigeria",
        summary:
          "The Central Bank of Nigeria's enforcement actions against cryptocurrency exchanges, raising fundamental questions about the legal boundaries of central bank regulatory authority in the digital asset space.",
      },
      {
        name: "Stanbic IBTC Pension v. CBN",
        jurisdiction: "Nigeria",
        summary:
          "A significant case examining the scope of Central Bank regulatory powers over pension fund administrators and the boundaries between banking and securities regulation.",
      },
    ],
    keyJournals: [
      "Journal of Banking and Finance Law and Practice",
      "African Journal of International Financial Law",
      "Central Banking Review",
      "Nigerian Journal of Banking and Financial Law",
    ],
    closingStatement:
      "From traditional banking regulation to the frontiers of digital finance, Law Digest keeps you informed about the legal developments that shape Africa's financial future. Our coverage provides the analytical depth that financial law practitioners need to serve their clients effectively.",
  },

  /* ════════════════════════════════════════════════════════════════════
     CAPITAL MARKETS
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "capital-markets",
    heroImage:
      "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=1200&q=80",
    heroAlt: "Stock market trading screen with data",
    headline: "Capital Markets",
    subheadline: "The law governing investment and securities",
    intro:
      "Law Digest examines the legal frameworks governing capital markets across Africa, including securities regulation, stock exchange rules, investment fund structures, and the evolving regulatory environment for public offerings and private placements. Africa's capital markets are at an inflection point — growing in sophistication, attracting international capital, and developing regulatory frameworks that rival those of established markets.",
    sections: [
      imgSection(
        "Market Development and Regulatory Reform",
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
        "Market analysis and financial data on multiple screens",
        [
          "Africa's capital markets are maturing rapidly, with new exchanges, regulatory frameworks, and investment products emerging across the continent. From the Nigerian Exchange Limited to the Johannesburg Stock Exchange, the legal landscape governing securities, derivatives, and investment funds is becoming increasingly sophisticated. Law Digest provides the analysis practitioners need to navigate this complex environment.",
          "Recent regulatory reforms across African capital markets have focused on improving market transparency, strengthening investor protection, and facilitating cross-border investment. These reforms create opportunities for issuers, investors, and their advisors — but they also create compliance challenges that require careful legal analysis.",
          "Law Digest's capital markets coverage is led by practitioners with direct experience of securities regulation, IPO processes, and fund formation across African jurisdictions.",
        ],
        "right"
      ),
      {
        heading: "Core Areas of Coverage",
        blocks: [
          {
            type: "paragraph",
            text: "We examine the full spectrum of capital markets law, including:",
          },
          {
            type: "paragraph",
            text: "Securities regulation — covering the legal frameworks governing the offer, sale, and trading of securities, including prospectus requirements, exemptions, and ongoing disclosure obligations.",
          },
          {
            type: "paragraph",
            text: "Initial public offerings and listing requirements — examining the legal and regulatory requirements for companies seeking to list on African stock exchanges, including corporate governance prerequisites and ongoing compliance obligations.",
          },
          {
            type: "paragraph",
            text: "Collective investment schemes — covering the regulation of mutual funds, exchange-traded funds, private equity funds, and other collective investment vehicles, including licensing, disclosure, and investor protection requirements.",
          },
          {
            type: "paragraph",
            text: "Market conduct and enforcement — examining insider trading prohibition, market manipulation, front-running, and the enforcement mechanisms available to securities regulators.",
          },
          {
            type: "paragraph",
            text: "Cross-border capital flows — covering the legal frameworks governing foreign portfolio investment, capital controls, withholding tax, and the regulatory cooperation agreements that facilitate cross-border securities offerings.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
            alt: "Financial data displays in a trading environment",
            caption: "Capital markets data drives investment decisions",
          },
        ],
        imagePosition: "left",
      },
      {
        heading: "Green Bonds and Sustainable Finance",
        blocks: [
          {
            type: "paragraph",
            text: "The emergence of green bonds and sustainable finance instruments across African capital markets represents a significant development. Law Digest examines the legal frameworks governing green bond issuance, including the taxonomy requirements, verification processes, and reporting obligations that issuers must satisfy.",
          },
          {
            type: "paragraph",
            text: "We also cover the growing role of environmental, social, and governance (ESG) criteria in investment decision-making, examining how securities regulation is evolving to incorporate sustainability disclosure requirements and the legal implications for listed companies and fund managers.",
          },
          {
            type: "paragraph",
            text: "Nigeria's green bond programme, Kenya's sustainable finance guidelines, and South Africa's responsible investment framework are all examined in depth, providing practitioners with the analysis they need to advise clients in this rapidly evolving space.",
          },
        ],
      },
      {
        heading: "The Impact for Legal Practitioners",
        blocks: [
          {
            type: "paragraph",
            text: "Capital markets law requires deep understanding of both legal frameworks and market dynamics. Law Digest bridges this gap by providing practical analysis that connects regulatory requirements with real-world market practice, helping lawyers advise clients effectively in an ever-changing investment landscape.",
          },
          {
            type: "paragraph",
            text: "For transactional lawyers, our coverage provides insight into the regulatory approval processes, documentation requirements, and compliance considerations that determine whether a capital markets transaction succeeds or fails. For regulatory practitioners, we offer analysis of enforcement trends, policy developments, and institutional reforms.",
          },
        ],
      },
    ],
    pullQuote: { text: "Africa's capital markets are no longer frontier markets — they are emerging as a distinct asset class with their own regulatory logic and investment thesis." },
    keyStats: [
      {
        value: "28",
        label: "Stock Exchanges",
        detail: "Active stock exchanges across the African continent",
      },
      {
        value: "$1.8T",
        label: "Market Capitalisation",
        detail: "Combined market capitalisation of Africa's major exchanges",
      },
      {
        value: "45%",
        label: "Growth",
        detail: "Increase in African IPO activity over the past five years",
      },
    ],
    notableCases: [
      {
        name: "Seplat Energy Plc v. SEC Nigeria",
        jurisdiction: "Nigeria",
        summary:
          "A significant case examining the Securities and Exchange Commission's authority over listed company transactions and the intersection of company law with securities regulation.",
      },
    ],
    keyJournals: [
      "Securities Regulation Journal",
      "Journal of Capital Markets Studies",
      "African Finance Journal",
      "Review of Securities & Commodities Regulation",
    ],
    closingStatement:
      "Stay informed about the regulatory developments shaping Africa's capital markets with Law Digest's authoritative coverage. Our analysis connects market practice with legal framework, providing the insight that transactional and regulatory practitioners need.",
  },

  /* ════════════════════════════════════════════════════════════════════
     COMMERCIAL & CORPORATE LAW
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "commercial-corporate-law",
    heroImage:
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80",
    heroAlt: "Corporate office building with glass facade",
    headline: "Commercial & Corporate Law",
    subheadline: "The foundation of business legal practice",
    intro:
      "Law Digest provides comprehensive coverage of commercial and corporate law, examining the legal frameworks that govern business operations, mergers and acquisitions, corporate governance, and commercial transactions across Africa and internationally. As the continent's business landscape evolves, the legal frameworks governing commercial activity must adapt to accommodate new business models, cross-border structures, and changing regulatory expectations.",
    sections: [
      imgSection(
        "The Backbone of African Commerce",
        "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80",
        "Business professionals in a boardroom meeting",
        [
          "Commercial and corporate law forms the backbone of business activity across Africa. As companies expand, merge, restructure, and navigate increasingly complex regulatory environments, understanding the legal dimensions of corporate activity becomes essential. Law Digest's coverage brings together analysis from leading corporate lawyers, judges, and academics.",
          "The past decade has seen a dramatic increase in cross-border M&A activity in Africa, driven by sector consolidation, foreign direct investment, and the integration of regional markets under frameworks such as the African Continental Free Trade Area. These transactions create complex legal challenges that require expertise in multiple jurisdictions and legal traditions.",
          "Law Digest's commercial and corporate law coverage reflects the continent's diversity, drawing on contributions from practitioners across common law, civil law, and hybrid jurisdictions to provide analysis that is relevant across the African legal landscape.",
        ],
        "left"
      ),
      {
        heading: "Mergers, Acquisitions, and Restructuring",
        blocks: [
          {
            type: "paragraph",
            text: "M&A activity in Africa has reached record levels, driven by sector consolidation in banking, telecommunications, and energy, as well as increasing interest from international investors. Law Digest examines the legal frameworks governing these transactions, including merger control, foreign investment screening, and the regulatory approvals required across multiple jurisdictions.",
          },
          {
            type: "paragraph",
            text: "We provide detailed analysis of deal structures, including share acquisitions, asset purchases, mergers, schemes of arrangement, and leveraged buyouts, examining the legal requirements and practical considerations specific to African markets.",
          },
          {
            type: "paragraph",
            text: "Corporate restructuring — including demergers, spin-offs, and business separations — is an increasingly important area as African conglomerates seek to unlock shareholder value and sharpen strategic focus. Law Digest covers the legal frameworks governing these transactions across major African jurisdictions.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&q=80",
            alt: "Legal contracts and corporate documents on a desk",
            caption: "M&A transactions require meticulous legal documentation",
          },
        ],
        imagePosition: "right",
      },
      {
        heading: "Competition and Antitrust Law",
        blocks: [
          {
            type: "paragraph",
            text: "Competition law enforcement across Africa has intensified significantly, with merger control regimes now operational in Nigeria, Kenya, South Africa, Egypt, and several other jurisdictions. Law Digest tracks enforcement trends, regulatory decisions, and policy developments across the continent.",
          },
          {
            type: "paragraph",
            text: "We examine abuse of dominance cases, cartel enforcement, and the growing intersection between competition law and sector-specific regulation, particularly in telecommunications, banking, and digital markets.",
          },
          {
            type: "paragraph",
            text: "The African Competition Forum and regional competition frameworks, including the COMESA Competition Commission, are also covered in depth, providing practitioners with a comprehensive view of the multi-jurisdictional competition law landscape.",
          },
        ],
      },
      {
        heading: "Insolvency and Business Rescue",
        blocks: [
          {
            type: "paragraph",
            text: "Insolvency law across Africa is evolving from liquidation-centred frameworks toward modern business rescue and reorganisation regimes. South Africa's Business Rescue Proceedings, Nigeria's winding-up reforms, and Kenya's Insolvency Act represent significant developments in this space.",
          },
          {
            type: "paragraph",
            text: "Law Digest examines the practical operation of these frameworks, including the rights of secured and unsecured creditors, the role of insolvency practitioners, and the cross-border insolvency challenges that arise when companies operate across multiple African jurisdictions.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
            alt: "Legal books and corporate governance documents",
            caption: "Insolvency frameworks are evolving across Africa",
          },
        ],
        imagePosition: "left",
      },
      {
        heading: "Why It Matters",
        blocks: [
          {
            type: "paragraph",
            text: "Every business decision has legal implications. From structuring a major acquisition to navigating daily commercial obligations, practitioners need current, reliable analysis. Law Digest delivers that analysis, drawing on expertise from across the common law world to help lawyers serve their clients effectively.",
          },
          {
            type: "paragraph",
            text: "The commercial and corporate law landscape in Africa is characterised by rapid change — new legislation, evolving judicial interpretation, and shifting regulatory expectations. Law Digest provides the continuous monitoring and analysis that practitioners need to stay ahead of these developments.",
          },
        ],
      },
    ],
    pullQuote: { text: "Africa's corporate legal landscape is no longer defined by what it lacks — it is increasingly defined by the sophistication and ambition of its regulatory frameworks." },
    keyStats: [
      {
        value: "$180B+",
        label: "M&A Volume",
        detail: "Annual M&A deal value across Africa in recent years",
      },
      {
        value: "34",
        label: "Merger Control Regimes",
        detail: "African jurisdictions with operational merger notification requirements",
      },
      {
        value: "5",
        label: "AfCFTA Benefits",
        detail: "Key legal frameworks enabling cross-border commercial activity under the African Continental Free Trade Area",
      },
    ],
    notableCases: [
      {
        name: "Shoprite Checkers v. Union for Food & Allied Workers",
        jurisdiction: "South Africa",
        summary:
          "A landmark case examining the limits of corporate restructuring in the context of employee protection and the intersection of company law with labour law.",
      },
      {
        name: "MTN Nigeria v. AG Federation",
        jurisdiction: "Nigeria",
        summary:
          "Significant proceedings examining the regulatory framework for telecommunications companies and the boundaries of federal regulatory authority.",
      },
    ],
    keyJournals: [
      "Company Lawyer",
      "Journal of Corporate Law Studies",
      "African Business Law Review",
      "International Corporate Rescue",
    ],
    closingStatement:
      "From boardroom strategy to regulatory compliance, Law Digest keeps corporate practitioners informed about the legal developments that matter most. Our coverage provides the analytical depth that distinguishes excellent corporate law practice.",
  },

  /* ════════════════════════════════════════════════════════════════════
     CONSUMER PROTECTION
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "consumer-protection",
    heroImage:
      "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1200&q=80",
    heroAlt: "Consumers shopping in a retail environment",
    headline: "Consumer Protection",
    subheadline: "Safeguarding rights in the modern marketplace",
    intro:
      "Law Digest examines consumer protection law and policy, covering the legal frameworks that safeguard consumer rights, regulate product safety, and govern fair trading practices across Africa. Consumer protection is undergoing a fundamental transformation as digital commerce, financial services, and cross-border trade create new challenges for regulators, businesses, and consumers alike.",
    sections: [
      imgSection(
        "The Evolving Consumer Landscape",
        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80",
        "Digital commerce and online consumer transactions",
        [
          "Consumer protection law is evolving rapidly across Africa as new regulations address digital commerce, financial services, product safety, and data privacy. Law Digest tracks these developments with analysis from consumer law specialists, regulators, and policy makers, helping practitioners understand how consumer rights are being shaped and enforced.",
          "Nigeria's Federal Competition and Consumer Protection Commission (FCCPC) has emerged as one of Africa's most active consumer protection enforcers, with enforcement actions spanning telecommunications, banking, digital services, and consumer products. The FCCPC's approach — combining enforcement with advocacy — provides a model for consumer protection across the continent.",
          "Law Digest examines not only the legislative frameworks but also the enforcement mechanisms, institutional capacity, and practical challenges that shape how consumer protection law operates in African jurisdictions.",
        ],
        "right"
      ),
      {
        heading: "Key Areas of Focus",
        blocks: [
          {
            type: "paragraph",
            text: "We cover the full spectrum of consumer protection law, including:",
          },
          {
            type: "paragraph",
            text: "Consumer credit regulation — examining the legal frameworks governing lending practices, disclosure requirements, and the protection of borrowers from predatory lending and over-indebtedness.",
          },
          {
            type: "paragraph",
            text: "Product liability and safety — covering the standards, testing requirements, and liability frameworks that protect consumers from defective products, with particular attention to pharmaceutical, automotive, and consumer electronics regulation.",
          },
          {
            type: "paragraph",
            text: "E-commerce and digital consumer protection — addressing the unique challenges of online transactions, including distance selling regulations, digital contract formation, platform liability, and the protection of digital consumer rights.",
          },
          {
            type: "paragraph",
            text: "Financial services consumer safeguards — examining the conduct of business rules, suitability requirements, and complaint resolution mechanisms that protect consumers of banking, insurance, and investment products.",
          },
          {
            type: "paragraph",
            text: "Data protection and privacy — covering the consumer privacy rights emerging from data protection legislation, including the Nigeria Data Protection Act, and the intersection of privacy law with consumer protection.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&q=80",
            alt: "Consumer rights and shopping",
            caption: "Modern consumer protection spans digital and physical markets",
          },
        ],
        imagePosition: "left",
      },
      {
        heading: "Digital Consumer Rights",
        blocks: [
          {
            type: "paragraph",
            text: "The growth of e-commerce and digital services across Africa has created new categories of consumer harm that existing legal frameworks were not designed to address. Issues such as algorithmic pricing, dark patterns in digital interfaces, subscription traps, and digital content quality are increasingly relevant to African consumers.",
          },
          {
            type: "paragraph",
            text: "Law Digest examines how regulators across the continent are adapting their approaches to address these digital-era consumer protection challenges, including the development of specific regulations for digital services, platform accountability, and online dispute resolution.",
          },
          {
            type: "paragraph",
            text: "We also cover the intersection of consumer protection with competition law in digital markets, examining how the dominance of large technology platforms affects consumer choice, pricing, and data rights.",
          },
        ],
      },
      {
        heading: "The Practical Dimension",
        blocks: [
          {
            type: "paragraph",
            text: "Consumer protection is not just about legislation — it is about enforcement, compliance, and the real-world impact of legal frameworks on businesses and individuals. Law Digest bridges the gap between policy and practice, providing analysis that helps lawyers, businesses, and regulators navigate this important area of law.",
          },
          {
            type: "paragraph",
            text: "For businesses, understanding consumer protection obligations is increasingly critical as enforcement activity intensifies across the continent. Non-compliance can result in significant financial penalties, reputational damage, and restrictions on business operations.",
          },
        ],
      },
    ],
    pullQuote: { text: "Consumer protection law is the legal system's promise that the marketplace will operate fairly — and in Africa, that promise is being enforced with increasing vigour." },
    keyStats: [
      {
        value: "12",
        label: "FCCPC Enforcement Actions",
        detail: "Major enforcement actions by Nigeria's consumer protection commission in the past year",
      },
      {
        value: "40+",
        label: "Consumer Protection Laws",
        detail: "Active consumer protection statutes across African jurisdictions",
      },
      {
        value: "85%",
        label: "Digital Growth",
        detail: "Growth in e-commerce transactions requiring consumer protection frameworks",
      },
    ],
    notableCases: [
      {
        name: "FCCPC v. Multichoice Nigeria",
        jurisdiction: "Nigeria",
        summary:
          "A high-profile enforcement action examining pricing practices and consumer rights in the digital broadcasting and entertainment sector.",
      },
    ],
    keyJournals: [
      "Journal of Consumer Policy",
      "International Review of Law",
      "African Journal of Consumer Protection",
      "Consumer Law Quarterly Review",
    ],
    closingStatement:
      "Understanding consumer protection law is essential for any practitioner advising businesses. Law Digest keeps you informed about the regulations that shape the modern marketplace, providing the analysis that helps businesses comply and consumers understand their rights.",
  },

  /* ════════════════════════════════════════════════════════════════════
     CORPORATE GOVERNANCE
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "corporate-governance",
    heroImage:
      "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=1200&q=80",
    heroAlt: "Executive leadership team in a boardroom",
    headline: "Corporate Governance",
    subheadline: "Accountability, transparency, and leadership",
    intro:
      "Law Digest provides authoritative analysis of corporate governance frameworks, board responsibilities, shareholder rights, and the evolving standards of accountability and transparency that shape how companies are directed and controlled. Good corporate governance is not merely a compliance exercise — it is the foundation of investor confidence, market credibility, and sustainable business practice.",
    sections: [
      imgSection(
        "The Governance Imperative",
        "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
        "Board of directors meeting in a corporate setting",
        [
          "Good corporate governance is fundamental to investor confidence, market integrity, and sustainable business practice. Across Africa, governance codes are being developed, updated, and enforced with increasing rigour. Law Digest examines these developments, drawing on insights from governance experts, institutional investors, and regulatory authorities.",
          "The Nigerian Code of Corporate Governance (2018), the South African King IV Report, and the Kenya Corporate Governance Practices Guidelines represent a new wave of governance regulation that reflects international best practice while addressing the specific challenges of African markets.",
          "Law Digest's governance coverage goes beyond reporting governance codes to examining their practical implementation, enforcement mechanisms, and impact on corporate behaviour across the continent.",
        ],
        "right"
      ),
      {
        heading: "What We Cover",
        blocks: [
          {
            type: "paragraph",
            text: "Our coverage encompasses the full range of corporate governance issues, including:",
          },
          {
            type: "paragraph",
            text: "Board composition and independence — examining the legal and regulatory requirements for board structure, the role of independent directors, and the practical challenges of maintaining board independence in concentrated ownership structures.",
          },
          {
            type: "paragraph",
            text: "Shareholder rights and engagement — covering the legal frameworks governing shareholder meetings, proxy voting, related-party transactions, and the mechanisms available for minority shareholder protection.",
          },
          {
            type: "paragraph",
            text: "Executive remuneration — examining disclosure requirements, say-on-pay provisions, and the governance frameworks that regulate executive compensation in listed companies.",
          },
          {
            type: "paragraph",
            text: "Environmental, social, and governance (ESG) disclosure — covering the emerging requirements for sustainability reporting, climate risk disclosure, and the integration of ESG factors into corporate governance frameworks.",
          },
          {
            type: "paragraph",
            text: "Risk management — examining the legal frameworks governing enterprise risk management, internal audit functions, and the board's responsibility for overseeing risk in complex organisations.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
            alt: "Corporate governance documentation and compliance materials",
            caption: "Governance documentation underpins corporate accountability",
          },
        ],
        imagePosition: "left",
      },
      {
        heading: "The ESG Revolution",
        blocks: [
          {
            type: "paragraph",
            text: "Environmental, social, and governance factors are rapidly becoming integral to corporate governance frameworks across Africa. Institutional investors, international regulators, and civil society organisations are all demanding greater transparency and accountability on ESG issues.",
          },
          {
            type: "paragraph",
            text: "Law Digest examines how these global trends are being translated into African governance frameworks, including the development of sustainability reporting standards, climate risk disclosure requirements, and the integration of social responsibility into corporate governance practice.",
          },
          {
            type: "paragraph",
            text: "We also cover the growing intersection between ESG governance and access to capital, as international investors increasingly factor ESG performance into investment decisions affecting African companies and markets.",
          },
        ],
      },
      {
        heading: "Why Governance Coverage Matters",
        blocks: [
          {
            type: "paragraph",
            text: "As African markets attract increasing international investment, governance standards become critical to market credibility. Law Digest helps practitioners, directors, and investors understand the governance expectations that drive confidence in Africa's corporate sector.",
          },
          {
            type: "paragraph",
            text: "For corporate directors, understanding governance obligations is essential to avoiding personal liability and maintaining the trust of shareholders, regulators, and the public. For investors, governance quality is increasingly recognised as a key driver of long-term value creation and risk management.",
          },
        ],
      },
    ],
    pullQuote: { text: "Corporate governance is not a constraint on business — it is the foundation upon which sustainable, profitable, and trusted businesses are built." },
    keyStats: [
      {
        value: "15",
        label: "Governance Codes",
        detail: "African jurisdictions with published corporate governance codes",
      },
      {
        value: "40%",
        label: "Board Independence",
        detail: "Average independent director representation on listed company boards",
      },
      {
        value: "67%",
        label: "ESG Adoption",
        detail: "African listed companies reporting on ESG factors",
      },
    ],
    notableCases: [
      {
        name: "ExxonMobil v. AG Federation & NAPIMS",
        jurisdiction: "Nigeria",
        summary:
          "A significant case examining corporate governance in joint ventures involving international oil companies and government entities, raising important questions about transparency and accountability in the extractive industries.",
      },
    ],
    keyJournals: [
      "Corporate Governance: An International Review",
      "Journal of Business Law",
      "International Journal of Disclosure and Governance",
      "African Journal of Economic and Management Studies",
    ],
    closingStatement:
      "Strong governance builds strong businesses. Law Digest provides the analysis that helps professionals understand and meet the governance standards expected in today's markets — standards that are increasingly essential for attracting investment, maintaining market credibility, and building sustainable organisations.",
  },

  /* ════════════════════════════════════════════════════════════════════
     ENERGY LAW
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "energy-law",
    heroImage:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&q=80",
    heroAlt: "Solar panels and energy infrastructure at sunset",
    headline: "Energy Law",
    subheadline: "Powering Africa's legal and economic future",
    intro:
      "Law Digest covers the legal frameworks governing energy production, distribution, and regulation across Africa. From oil and gas to renewable energy, we examine the legal dimensions of Africa's evolving energy landscape. The continent stands at the intersection of immense resource wealth and a global energy transition, creating legal challenges and opportunities that are reshaping the practice of energy law.",
    sections: [
      imgSection(
        "Africa's Energy Transformation",
        "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80",
        "Wind turbines and renewable energy infrastructure",
        [
          "Africa's energy sector is experiencing a fundamental transformation. The transition from fossil fuels to renewable energy, the development of natural gas resources, and the expansion of electricity access across the continent are all creating new legal challenges and opportunities. Law Digest provides the analysis practitioners need to navigate this dynamic landscape.",
          "Nigeria, as Africa's largest oil producer and most populous nation, faces unique energy law challenges — from the reform of the Petroleum Industry Act to the regulation of off-grid solar, the development of natural gas as a transition fuel, and the integration of renewable energy into the national grid. These developments have implications that extend far beyond Nigeria's borders.",
          "Law Digest's energy law coverage draws on contributions from leading energy lawyers, regulatory experts, and industry practitioners across the continent, providing analysis that connects legal frameworks with commercial reality.",
        ],
        "right"
      ),
      {
        heading: "Oil and Gas Regulation",
        blocks: [
          {
            type: "paragraph",
            text: "Africa's oil and gas sector remains a critical component of the continent's energy landscape, even as the energy transition accelerates. Law Digest examines the legal frameworks governing upstream exploration and production, midstream transportation and processing, and downstream refining and distribution.",
          },
          {
            type: "paragraph",
            text: "Nigeria's Petroleum Industry Act (2021) represents the most significant reform of the country's oil and gas legal framework in decades. Law Digest has provided comprehensive analysis of the Act's provisions governing fiscal terms, host community development, gas commercialisation, and the restructuring of the national oil company.",
          },
          {
            type: "paragraph",
            text: "We also cover the growing importance of natural gas across the continent, examining the legal frameworks for gas-to-power projects, LNG export terminals, and the regulatory treatment of gas as a transition fuel in the context of climate commitments.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&q=80",
            alt: "Oil and gas operations in an African landscape",
            caption: "Oil and gas regulation remains central to Africa's energy law",
          },
        ],
        imagePosition: "left",
      },
      {
        heading: "Renewable Energy and Clean Technology",
        blocks: [
          {
            type: "paragraph",
            text: "The renewable energy sector across Africa is growing rapidly, driven by declining technology costs, increasing energy demand, and supportive policy frameworks. Law Digest examines the legal frameworks governing solar, wind, hydroelectric, and other renewable energy projects, including power purchase agreements, feed-in tariffs, and renewable energy certificate systems.",
          },
          {
            type: "paragraph",
            text: "We cover the legal challenges facing renewable energy developers, including land acquisition, environmental permitting, grid connection, and the regulatory frameworks for independent power producers. The intersection of renewable energy with climate law, carbon markets, and international climate finance is also a key focus area.",
          },
          {
            type: "paragraph",
            text: "Off-grid and distributed energy solutions present unique regulatory challenges, particularly in countries where the electricity sector was historically structured around centralised generation and transmission. Law Digest examines how regulators are adapting to accommodate distributed energy business models.",
          },
        ],
      },
      {
        heading: "Dispute Resolution in the Energy Sector",
        blocks: [
          {
            type: "paragraph",
            text: "Energy sector disputes — including production-sharing contract disagreements, power purchase agreement arbitrations, and regulatory taking claims — represent some of the highest-value and most complex disputes in African arbitration. Law Digest examines these disputes and their implications for the energy sector.",
          },
          {
            type: "paragraph",
            text: "We cover both international arbitration proceedings and domestic litigation, examining the enforcement of energy contracts, the resolution of regulatory disputes, and the development of specialised energy dispute resolution mechanisms.",
          },
        ],
      },
      {
        heading: "The Importance of Energy Law",
        blocks: [
          {
            type: "paragraph",
            text: "Energy is the engine of economic development. The legal frameworks governing energy production, distribution, and consumption shape the prosperity of nations. Law Digest ensures our readers understand the legal developments that drive Africa's energy future.",
          },
          {
            type: "paragraph",
            text: "For practitioners in the energy sector, understanding the rapidly evolving legal landscape is essential for advising clients, structuring transactions, and managing regulatory risk. Law Digest provides the continuous, in-depth analysis that distinguishes expert energy law practice.",
          },
        ],
      },
    ],
    pullQuote: { text: "Africa's energy transition is not just an environmental imperative — it is the greatest legal and commercial opportunity the continent's energy sector has ever faced." },
    keyStats: [
      {
        value: "$50B+",
        label: "Clean Energy Investment",
        detail: "Annual clean energy investment flowing into African energy markets",
      },
      {
        value: "600M",
        label: "Without Electricity",
        detail: "Africans still lacking reliable access to electricity",
      },
      {
        value: "10GW",
        label: "Solar Capacity",
        detail: "Projected solar energy capacity across Africa by 2030",
      },
    ],
    notableCases: [
      {
        name: "Shell v. Federal Republic of Nigeria (ICSID)",
        jurisdiction: "ICSID",
        summary:
          "A landmark investor-state arbitration concerning the regulatory framework for oil and gas operations in the Niger Delta, examining questions of environmental liability, community rights, and the boundaries of state regulatory authority.",
      },
    ],
    keyJournals: [
      "Journal of Energy & Natural Resources Law",
      "Oil, Gas & Energy Law Intelligence",
      "African Journal of Energy and Natural Resources Law",
      "Natural Resources & Energy Journal",
    ],
    closingStatement:
      "From oil fields to solar farms, Law Digest provides the legal analysis that powers understanding of Africa's energy transformation. Our coverage connects legal frameworks with commercial reality, providing the insight that energy law practitioners need.",
  },

  /* ════════════════════════════════════════════════════════════════════
     ENTERTAINMENT LAW
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "entertainment-law",
    heroImage:
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80",
    heroAlt: "Concert stage with dramatic lighting",
    headline: "Entertainment Law",
    subheadline: "The law of creativity, media, and culture",
    intro:
      "Law Digest examines the legal dimensions of Africa's booming entertainment and creative industries, covering intellectual property, media regulation, talent agreements, and the business of entertainment across the continent. From Nollywood to Afrobeats, from fashion to gaming, the legal frameworks governing creative production and distribution are becoming increasingly sophisticated and commercially significant.",
    sections: [
      imgSection(
        "Africa's Creative Economy",
        "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80",
        "Recording studio with professional music equipment",
        [
          "Africa's entertainment industry — from Nollywood to Afrobeats, from fashion to gaming — is experiencing unprecedented growth. With that growth comes complex legal questions about rights, royalties, licensing, and regulation. Law Digest provides authoritative analysis of the legal issues driving Africa's creative economy.",
          "The global success of African entertainment — Afrobeats topping international charts, Nollywood becoming the world's second-largest film industry by output, African fashion brands achieving international recognition — has created new legal challenges around intellectual property protection, international distribution, and the monetisation of creative content.",
          "Law Digest's entertainment law coverage brings together analysis from entertainment lawyers, industry practitioners, and academics who understand both the creative and commercial dimensions of Africa's entertainment sector.",
        ],
        "left"
      ),
      {
        heading: "Music Industry Law",
        blocks: [
          {
            type: "paragraph",
            text: "The African music industry has undergone a dramatic transformation, with streaming platforms, international record deals, and live performance revenues creating new legal complexities. Law Digest examines the contract structures, royalty frameworks, and intellectual property issues that govern the African music business.",
          },
          {
            type: "paragraph",
            text: "We cover recording contracts, publishing agreements, distribution deals, and the emerging models for independent artist management. The intersection of music law with technology — including streaming royalty calculations, digital rights management, and the impact of artificial intelligence on music creation — is a key focus area.",
          },
          {
            type: "paragraph",
            text: "We also examine the regulatory frameworks for music licensing, public performance rights, and the development of collective management organisations across the continent.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
            alt: "Live music performance with stage lighting",
            caption: "Live performance law is a growing area of entertainment practice",
          },
        ],
        imagePosition: "right",
      },
      {
        heading: "Film, Television, and Broadcasting",
        blocks: [
          {
            type: "paragraph",
            text: "Nollywood's growth — along with emerging film industries in Ghana, Kenya, Tanzania, and South Africa — has created significant legal complexity around film financing, production agreements, distribution contracts, and content regulation.",
          },
          {
            type: "paragraph",
            text: "Law Digest examines the legal frameworks governing film and television production, including co-production treaties, tax incentive programmes, content classification systems, and the regulatory requirements for broadcasting and streaming services operating in African markets.",
          },
          {
            type: "paragraph",
            text: "The rise of streaming platforms — Netflix, Amazon Prime Video, Showmax, and local competitors — has fundamentally altered the distribution landscape, creating new contractual models and regulatory questions about content standards, local content requirements, and data protection.",
          },
        ],
      },
      {
        heading: "Sports Law and Athlete Representation",
        blocks: [
          {
            type: "paragraph",
            text: "Africa's sporting talent — from football to athletics, basketball to boxing — generates significant commercial activity and associated legal complexity. Law Digest examines the regulatory frameworks governing athlete representation, transfer agreements, sponsorship contracts, and doping regulation.",
          },
          {
            type: "paragraph",
            text: "We cover the development of domestic sports arbitration mechanisms, the regulation of sports betting, and the intersection of sports law with human rights, including the protection of athletes' rights and the governance of sports federations.",
          },
          {
            type: "paragraph",
            text: "The legal issues surrounding major sporting events hosted in Africa — including stadium construction, broadcasting rights, and legacy planning — are also examined in depth.",
          },
        ],
      },
      {
        heading: "Why This Area Matters",
        blocks: [
          {
            type: "paragraph",
            text: "The creative industries represent one of Africa's greatest economic opportunities. Understanding the legal frameworks that govern creative production, distribution, and monetisation is essential for artists, producers, investors, and their legal advisors. Law Digest bridges entertainment and law with practical, informed analysis.",
          },
          {
            type: "paragraph",
            text: "For practitioners entering the entertainment law space, understanding the unique commercial dynamics of African creative industries is essential. Standard contract templates developed for other markets often fail to address the specific challenges and opportunities that characterise African entertainment.",
          },
        ],
      },
    ],
    pullQuote: { text: "Africa's creative industries are not just entertaining the world — they are creating an entirely new body of entertainment law practice." },
    keyStats: [
      {
        value: "$7.4B",
        label: "Creative Economy",
        detail: "Estimated value of Africa's creative industries",
      },
      {
        value: "Nollywood",
        label: "2nd Largest",
        detail: "Film industry globally by number of annual productions",
      },
      {
        value: "25%",
        label: "Streaming Growth",
        detail: "Annual growth rate of music streaming revenues across Africa",
      },
    ],
    notableCases: [
      {
        name: "Cassper Nyovest v. Trade Mark Dispute",
        jurisdiction: "South Africa",
        summary:
          "A significant trade mark case involving an African music artist's brand protection, raising questions about the intersection of entertainment branding with intellectual property law.",
      },
    ],
    keyJournals: [
      "Entertainment Law Review",
      "International Review of Intellectual Property and Competition Law",
      "Journal of Media Law",
      "African Journal of Intellectual Property",
    ],
    closingStatement:
      "Africa's creative industries deserve world-class legal coverage. Law Digest delivers analysis that connects entertainment, culture, and the law, providing the insight that practitioners need to serve Africa's fastest-growing economic sector.",
  },

  /* ════════════════════════════════════════════════════════════════════
     INTELLECTUAL PROPERTY
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "intellectual-property",
    heroImage:
      "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1200&q=80",
    heroAlt: "Light bulb symbolising innovation and intellectual property",
    headline: "Intellectual Property",
    subheadline: "Protecting innovation across Africa",
    intro:
      "Law Digest provides comprehensive coverage of intellectual property law, examining patent protection, trademark registration, copyright enforcement, and the evolving IP frameworks that protect innovation and creativity across Africa. As the continent's innovation ecosystem matures, intellectual property is becoming an increasingly critical asset — and an increasingly complex area of legal practice.",
    sections: [
      imgSection(
        "IP in Africa's Innovation Economy",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
        "Innovator working with patent documentation",
        [
          "Intellectual property is increasingly central to Africa's economic development. As innovation grows across technology, pharmaceuticals, manufacturing, and creative industries, understanding IP protection becomes critical. Law Digest examines the legal frameworks that protect intellectual property and the enforcement mechanisms that make those protections meaningful.",
          "The African Continental Free Trade Area (AfCFTA) Agreement includes an intellectual property protocol that has the potential to harmonise IP protection across the continent. Law Digest provides detailed analysis of this protocol and its implications for IP owners, innovators, and practitioners.",
          "We also examine the growing intersection between IP law and technology, including the patentability of artificial intelligence inventions, the copyright protection of AI-generated works, and the trade mark implications of brand building in digital markets.",
        ],
        "right"
      ),
      {
        heading: "Patents and Innovation Protection",
        blocks: [
          {
            type: "paragraph",
            text: "Patent law across Africa varies significantly, from the African Regional Intellectual Property Organization (ARIPO) system to the Organisation Africaine de la Propriété Intellectuelle (OAPI) framework, and the national patent systems of major economies such as Nigeria and South Africa. Law Digest provides analysis of patent protection across all major African jurisdictions.",
          },
          {
            type: "paragraph",
            text: "We examine the pharmaceutical patent landscape — a particularly significant area in Africa, where access to medicine and patent protection create complex policy tensions. The TRIPS flexibilities, compulsory licensing provisions, and the COVID-19-related patent waiver discussions are all covered in depth.",
          },
          {
            type: "paragraph",
            text: "Technology patents — covering software, fintech innovations, and agricultural technology — represent a growing area of IP activity across Africa. Law Digest examines the patentability requirements, filing strategies, and enforcement mechanisms relevant to technology patents in African jurisdictions.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
            alt: "Technology innovation and patent research",
            caption: "Technology patents are a growing area of IP practice in Africa",
          },
        ],
        imagePosition: "left",
      },
      {
        heading: "Trademarks and Brand Protection",
        blocks: [
          {
            type: "paragraph",
            text: "Brand protection across Africa requires navigating multiple registration systems, enforcement mechanisms, and legal traditions. Law Digest examines the trade mark registration process across major African jurisdictions, including the Madrid Protocol system, ARIPO, OAPI, and national filing systems.",
          },
          {
            type: "paragraph",
            text: "We cover trade mark enforcement, including anti-counterfeiting measures, border enforcement, and online brand protection. The growth of e-commerce across Africa has created new challenges for brand owners, including the proliferation of counterfeit goods on digital platforms and the need for effective online enforcement mechanisms.",
          },
          {
            type: "paragraph",
            text: "Geographical indications — protecting unique African products such as Kenyan tea, Nigerian cocoa, and South African wine — represent an emerging area of IP protection with significant commercial potential.",
          },
        ],
      },
      {
        heading: "Copyright and Digital Content",
        blocks: [
          {
            type: "paragraph",
            text: "The digital content revolution has fundamentally changed the copyright landscape in Africa. Streaming platforms, social media, and digital publishing have created new opportunities for content creators but also new challenges for copyright enforcement and remuneration.",
          },
          {
            type: "paragraph",
            text: "Law Digest examines the development of copyright frameworks across African jurisdictions, including the implementation of WIPO internet treaties, the regulation of collective management organisations, and the emerging issues around AI-generated content and the copyright implications of generative technology.",
          },
          {
            type: "paragraph",
            text: "We also cover the protection of traditional cultural expressions and traditional knowledge — a particularly important area in Africa, where indigenous cultural heritage faces both appropriation and inadequate legal protection.",
          },
        ],
      },
      {
        heading: "The Significance of IP Coverage",
        blocks: [
          {
            type: "paragraph",
            text: "As Africa's innovation ecosystem matures, intellectual property law becomes increasingly important. From protecting traditional knowledge to encouraging technological innovation, IP law shapes the economic future of the continent. Law Digest helps practitioners understand and navigate this essential area of law.",
          },
          {
            type: "paragraph",
            text: "For technology companies, pharmaceutical manufacturers, creative industries, and agricultural enterprises operating in Africa, understanding IP protection is not optional — it is a commercial necessity. Law Digest provides the analysis that helps these businesses protect and leverage their intellectual assets.",
          },
        ],
      },
    ],
    pullQuote: { text: "Intellectual property is the currency of the knowledge economy — and in Africa, that currency is appreciating rapidly." },
    keyStats: [
      {
        value: "ARIPO",
        label: "22 Member States",
        detail: "African Regional Intellectual Property Organization member countries",
      },
      {
        value: "3×",
        label: "Patent Filings",
        detail: "Tripling of patent applications in major African jurisdictions over the past decade",
      },
      {
        value: "70%",
        label: "Counterfeit Trade",
        detail: "Proportion of counterfeit goods seized at African borders that originate outside the continent",
      },
    ],
    notableCases: [
      {
        name: "Merck Sharp & Dohme v. Emzor Pharmaceutical",
        jurisdiction: "Nigeria",
        summary:
          "A significant patent and trade mark dispute in the pharmaceutical sector, examining the scope of patent protection for medicines and the boundaries between generic and branded pharmaceutical products.",
      },
    ],
    keyJournals: [
      "International Review of Intellectual Property and Competition Law",
      "Journal of Intellectual Property Law & Practice",
      "European Intellectual Property Review",
      "African Journal of International and Comparative Law",
    ],
    closingStatement:
      "Protecting ideas, brands, and innovation requires deep understanding of IP law. Law Digest provides the analysis that empowers practitioners across Africa to protect and leverage their clients' most valuable assets — their intellectual property.",
  },

  /* ════════════════════════════════════════════════════════════════════
     TECHNOLOGY LAW
     ════════════════════════════════════════════════════════════════════ */
  {
    slug: "technology-law",
    heroImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
    heroAlt: "Digital technology circuit board and data flow",
    headline: "Technology Law",
    subheadline: "Law at the frontier of digital innovation",
    intro:
      "Law Digest examines the rapidly evolving intersection of law and technology, covering data protection, cybersecurity regulation, artificial intelligence governance, and the legal frameworks that shape Africa's digital transformation. As technology transforms every aspect of African society — from mobile banking to digital government, from e-commerce to artificial intelligence — the legal frameworks governing these changes are becoming critically important.",
    sections: [
      imgSection(
        "Digital Africa, Legal Frontiers",
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
        "Cybersecurity operations centre with data screens",
        [
          "Technology is transforming every aspect of African society — from mobile banking to digital government, from e-commerce to artificial intelligence. This transformation raises fundamental legal questions about data protection, digital rights, platform regulation, and the governance of emerging technologies. Law Digest provides the analysis that helps legal professionals understand and navigate this frontier.",
          "Nigeria's position as Africa's largest technology market — with a thriving fintech ecosystem, a growing software development sector, and increasing digital government services — makes it a critical jurisdiction for technology law developments. Law Digest tracks these developments with the depth and rigour that technology law practitioners require.",
          "Our technology law coverage draws on contributions from practitioners, academics, and policy makers who are at the forefront of technology regulation across the continent, ensuring our analysis reflects both the technical realities of technology and the legal frameworks that govern it.",
        ],
        "right"
      ),
      {
        heading: "Data Protection and Privacy",
        blocks: [
          {
            type: "paragraph",
            text: "Data protection has emerged as one of the most significant areas of technology law across Africa. Nigeria's Nigeria Data Protection Act (2023), Kenya's Data Protection Act (2019), and South Africa's Protection of Personal Information Act (POPIA) represent a wave of data protection legislation that is reshaping how organisations collect, process, and share personal data.",
          },
          {
            type: "paragraph",
            text: "Law Digest provides comprehensive analysis of data protection frameworks across African jurisdictions, including enforcement trends, regulatory guidance, and the practical compliance challenges facing organisations operating across multiple African markets.",
          },
          {
            type: "paragraph",
            text: "We also examine the cross-border data transfer challenges facing multinational companies operating in Africa, the development of adequacy frameworks, and the intersection of data protection with sector-specific regulation in banking, healthcare, and telecommunications.",
          },
          {
            type: "image",
            url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
            alt: "Data centre infrastructure",
            caption: "Data protection regulation is reshaping African business practice",
          },
        ],
        imagePosition: "left",
      },
      {
        heading: "Artificial Intelligence Governance",
        blocks: [
          {
            type: "paragraph",
            text: "The governance of artificial intelligence has become a critical policy and legal issue across Africa. From facial recognition to algorithmic decision-making, from automated financial services to AI-powered healthcare, the deployment of AI technologies raises fundamental questions about accountability, transparency, and human rights.",
          },
          {
            type: "paragraph",
            text: "Law Digest examines the emerging AI governance frameworks across African jurisdictions, including Nigeria's National AI Strategy, the African Union's AI policy framework, and the regulatory approaches being adopted by individual countries to address AI-related risks and opportunities.",
          },
          {
            type: "paragraph",
            text: "We cover the legal implications of AI for employment law, intellectual property, competition law, and human rights, providing practitioners with a comprehensive view of the legal landscape surrounding AI deployment.",
          },
        ],
      },
      {
        heading: "Cybersecurity Law",
        blocks: [
          {
            type: "paragraph",
            text: "Cybersecurity is an increasingly critical concern for African businesses, governments, and individuals. Law Digest examines the legal frameworks governing cybersecurity across the continent, including Nigeria's Cybercrimes (Prohibition, Prevention, etc.) Act, Kenya's Computer Misuse and Cybercrimes Act, and the evolving regulatory landscape for incident response, data breach notification, and cybercrime prosecution.",
          },
          {
            type: "paragraph",
            text: "We cover the intersection of cybersecurity with financial regulation — including the Central Bank of Nigeria's cybersecurity guidelines for financial institutions — and the growing regulatory focus on critical infrastructure protection and national cybersecurity strategy.",
          },
          {
            type: "paragraph",
            text: "For practitioners advising financial institutions, technology companies, and government agencies, understanding cybersecurity legal obligations is becoming essential. Law Digest provides the analysis that helps organisations meet their legal obligations while managing cyber risk.",
          },
        ],
      },
      {
        heading: "Platform and Gig Economy Regulation",
        blocks: [
          {
            type: "paragraph",
            text: "Platform businesses — from ride-hailing to food delivery, from freelance marketplaces to social media — are creating new regulatory challenges across Africa. Questions about platform liability, worker classification, consumer protection, and data governance require new legal frameworks that existing legislation was not designed to address.",
          },
          {
            type: "paragraph",
            text: "Law Digest examines the regulatory approaches being adopted across African jurisdictions to address platform economy challenges, including the classification of gig workers, the liability of platform operators for content and services, and the competition law implications of platform market power.",
          },
        ],
      },
      {
        heading: "Why Technology Law Matters",
        blocks: [
          {
            type: "paragraph",
            text: "Every business is now a technology business. Understanding the legal frameworks that govern digital activity is essential for lawyers, businesses, and regulators. Law Digest bridges the gap between technology and law, providing practical analysis that helps our readers navigate Africa's digital future.",
          },
          {
            type: "paragraph",
            text: "For technology lawyers, staying current with the rapidly evolving regulatory landscape is a professional necessity. New legislation, regulatory guidance, and enforcement actions are emerging at a pace that requires continuous monitoring and analysis — precisely the service that Law Digest provides.",
          },
        ],
      },
    ],
    pullQuote: { text: "Technology law is no longer a niche practice area — it is the law that governs the future of every business, every government, and every individual on the continent." },
    keyStats: [
      {
        value: "NDPA",
        label: "Nigeria",
        detail: "Nigeria Data Protection Act 2023 — Africa's most comprehensive data protection framework",
      },
      {
        value: "$14.2B",
        label: "African Tech Investment",
        detail: "Total venture capital investment in African technology companies in 2023",
      },
      {
        value: "400M+",
        label: "Internet Users",
        detail: "Internet users across Africa — and growing rapidly",
      },
    ],
    notableCases: [
      {
        name: "NITDA v. Twitter Inc.",
        jurisdiction: "Nigeria",
        summary:
          "The Nigerian government's suspension of Twitter operations raised fundamental questions about the legal frameworks governing platform regulation, freedom of expression, and the boundaries of government authority over digital services.",
      },
      {
        name: "Standard Bank Data Breach Litigation",
        jurisdiction: "South Africa",
        summary:
          "Significant data breach proceedings examining the liability of financial institutions for cybersecurity failures and the enforcement of data protection obligations under POPIA.",
      },
    ],
    keyJournals: [
      "Computer Law & Security Review",
      "International Data Privacy Law",
      "Journal of Law, Information and Science",
      "Telecommunications Policy",
    ],
    closingStatement:
      "From data protection to AI governance, Law Digest provides the legal analysis that shapes understanding of Africa's digital transformation. Our coverage connects technology and law with the depth and rigour that practitioners need to advise clients in the digital age.",
  },
];

/**
 * Look up editorial content by slug.
 */
export function getPracticeAreaEditorial(
  slug: string
): PracticeAreaEditorial | null {
  return practiceAreaEditorials.find((e) => e.slug === slug) ?? null;
}
