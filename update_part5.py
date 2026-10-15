import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('part5_stylesheet.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_styles = '''
  // --- AUTHENTIC 1:1 VISUAL PARITY STYLES (photo_2026-10-15_18-13-34.jpg) ---
  topHeaderBarRed: {
    backgroundColor: '#B81414',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeftPillContainer: {
    alignItems: 'flex-start',
  },
  headerBizPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBizPillText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 6,
  },
  headerBizPillArrow: {
    width: 10,
    height: 10,
    tintColor: '#000000',
  },
  headerSubtitleWhite: {
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 4,
    marginLeft: 6,
    fontWeight: '500',
  },
  headerRightActionsRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerWhiteActionBtn: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerWhiteActionIcon: {
    width: 24,
    height: 24,
  },
  headerActionLabelWhite: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 3,
    fontWeight: '500',
  },
  headerBadgeWhite: {
    position: 'absolute',
    top: -5,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#B81414',
  },
  headerBadgeWhiteText: {
    color: '#B81414',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Yellow Promo Banner
  promoBannerCard: {
    backgroundColor: '#FFFED402',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  promoBannerImg: {
    width: 66,
    height: 76,
  },
  promoBannerTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  promoBannerBold: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    lineHeight: 28,
  },
  promoBannerSub: {
    fontSize: 10,
    color: '#374151',
    alignSelf: 'flex-end',
    marginTop: 2,
  },

  // 8-Item Quick Grid
  quickGridContainer: {
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  quickGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  quickGridItem: {
    width: '24%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  quickGridIcon: {
    width: 44,
    height: 44,
  },
  quickGridLabel: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Summary Card
  summaryCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  summaryCardCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCardAmountRed: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#B81414',
  },
  summaryCardAmountGreen: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C7D50',
  },
  summaryCardLabel: {
    fontSize: 13,
    color: '#111827',
    marginTop: 4,
  },
  summaryCardDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#E5E7EB',
  },

  // Search Pill & Counter Strip
  searchPillBar: {
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 6,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  counterStripRow: {
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
  },
  counterStripText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },

  // Customer List Rows
  customerListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerAvatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  customerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  customerCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  customerCardTime: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },
  customerCardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B81414',
    marginRight: 8,
  },
  customerChevron: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },

  // Floating Round FAB
  floatingRoundFab: {
    position: 'absolute',
    bottom: 20,
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B81414',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    zIndex: 10,
  },

  // Active Pill on Bottom Nav
  tabActivePill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
'''

if 'topHeaderBarRed:' not in content:
    idx = content.find('const styles = StyleSheet.create({') + len('const styles = StyleSheet.create({')
    content = content[:idx] + new_styles + content[idx:]

with open('part5_stylesheet.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('part5_stylesheet.js updated successfully!')
