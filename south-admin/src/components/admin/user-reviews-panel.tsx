'use client';

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, timeAgo, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Star, Search, Loader2, MessageSquare, Trash2,
  Eye, Ban, ThumbsUp, Flag, User, Calendar,
  Reply, AlertCircle, CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  serviceId?: string;
  serviceName?: string;
  status: 'published' | 'hidden' | 'flagged';
  adminReply?: string;
  repliedAt?: string;
  flaggedReason?: string;
  createdAt: string;
}

export default function UserReviewsPanel() {
  const { showToast, adminUser } = useAdminStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');

  // Reply dialog
  const [replyDialog, setReplyDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    const revRef = ref(database, 'userReviews');
    const unsub = onValue(revRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: Review[] = Object.entries(data).map(([key, val]: [string, any]) => ({
        id: key,
        userId: val.userId || '',
        userName: val.userName || 'مستخدم',
        userAvatar: val.userAvatar || '',
        rating: val.rating || 0,
        comment: val.comment || '',
        serviceId: val.serviceId || '',
        serviceName: val.serviceName || '',
        status: val.status || 'published',
        adminReply: val.adminReply || '',
        repliedAt: val.repliedAt || '',
        flaggedReason: val.flaggedReason || '',
        createdAt: val.createdAt || new Date().toISOString(),
      }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setReviews(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return reviews.filter(r => {
      const matchSearch = search === '' ||
        r.userName.toLowerCase().includes(search.toLowerCase()) ||
        r.comment.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchRating = ratingFilter === 'all' || r.rating === Number(ratingFilter);
      return matchSearch && matchStatus && matchRating;
    });
  }, [reviews, search, statusFilter, ratingFilter]);

  const stats = useMemo(() => ({
    total: reviews.length,
    avgRating: reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0',
    published: reviews.filter(r => r.status === 'published').length,
    flagged: reviews.filter(r => r.status === 'flagged').length,
    fiveStars: reviews.filter(r => r.rating === 5).length,
  }), [reviews]);

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) return;
    setReplying(true);
    try {
      await update(ref(database, `userReviews/${selectedReview.id}`), {
        adminReply: replyText.trim(),
        repliedAt: new Date().toISOString(),
      });
      showToast('تم إرسال الرد', 'success');
      setReplyDialog(false);
      setReplyText('');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    } finally {
      setReplying(false);
    }
  };

  const toggleStatus = async (review: Review, newStatus: 'published' | 'hidden') => {
    try {
      await update(ref(database, `userReviews/${review.id}`), { status: newStatus });
      showToast(newStatus === 'published' ? 'تم نشر التقييم' : 'تم إخفاء التقييم', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const deleteReview = async (id: string) => {
    try {
      await remove(ref(database, `userReviews/${id}`));
      showToast('تم حذف التقييم', 'success');
    } catch (e) {
      showToast('حدث خطأ', 'error');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn('w-4 h-4', i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300')}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5C1A1B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">جاري تحميل التقييمات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="w-7 h-7 text-[#5C1A1B]" />
          تقييمات المستخدمين
        </h1>
        <p className="text-muted-foreground text-sm mt-1">عرض وإدارة تقييمات ومراجعات المستخدمين</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'إجمالي التقييمات', value: stats.total, icon: MessageSquare, color: 'from-[#5C1A1B] to-[#3D0F10]' },
          { label: 'متوسط التقييم', value: stats.avgRating, icon: Star, color: 'from-yellow-600 to-yellow-800' },
          { label: 'منشورة', value: stats.published, icon: CheckCircle, color: 'from-green-600 to-green-800' },
          { label: 'مبلّغ عنها', value: stats.flagged, icon: Flag, color: 'from-red-600 to-red-800' },
          { label: 'تقييم 5 نجوم', value: stats.fiveStars, icon: Star, color: 'from-purple-600 to-purple-800' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', s.color)}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold">{s.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="published">منشور</SelectItem>
                <SelectItem value="hidden">مخفي</SelectItem>
                <SelectItem value="flagged">مبلّغ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="التقييم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="5">5 نجوم</SelectItem>
                <SelectItem value="4">4 نجوم</SelectItem>
                <SelectItem value="3">3 نجوم</SelectItem>
                <SelectItem value="2">نجمتان</SelectItem>
                <SelectItem value="1">نجمة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-muted-foreground">لا توجد تقييمات</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.slice(0, 50).map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <Card className={cn(
                  'border-0 shadow-sm hover:shadow-md transition-shadow',
                  review.status === 'flagged' && 'ring-1 ring-red-500/30',
                  review.status === 'hidden' && 'opacity-50'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#5C1A1B]/10 flex items-center justify-center shrink-0">
                        {review.userAvatar ? (
                          <img src={review.userAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-[#5C1A1B]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{review.userName}</span>
                          <div className="flex">{renderStars(review.rating)}</div>
                          <Badge variant="outline" className={cn(
                            'text-[10px]',
                            review.status === 'published' ? 'text-green-500' :
                            review.status === 'hidden' ? 'text-gray-500' : 'text-red-500'
                          )}>
                            {review.status === 'published' ? 'منشور' : review.status === 'hidden' ? 'مخفي' : 'مبلّغ'}
                          </Badge>
                        </div>
                        {review.serviceName && (
                          <p className="text-xs text-muted-foreground mb-1">الخدمة: {review.serviceName}</p>
                        )}
                        <p className="text-sm text-foreground/80">{review.comment}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {timeAgo(review.createdAt)}
                        </p>

                        {/* Admin Reply */}
                        {review.adminReply && (
                          <div className="mt-2 p-2 bg-[#5C1A1B]/5 rounded-lg border border-[#5C1A1B]/10">
                            <p className="text-[10px] font-medium text-[#5C1A1B] mb-1">رد الإدارة:</p>
                            <p className="text-xs text-foreground/70">{review.adminReply}</p>
                          </div>
                        )}

                        {/* Flagged reason */}
                        {review.status === 'flagged' && review.flaggedReason && (
                          <div className="mt-2 p-2 bg-red-500/5 rounded-lg">
                            <p className="text-[10px] text-red-500">سبب البلاغ: {review.flaggedReason}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => {
                              setSelectedReview(review);
                              setReplyText(review.adminReply || '');
                              setReplyDialog(true);
                            }}
                          >
                            <Reply className="w-3 h-3 ml-1" />
                            رد
                          </Button>
                          {review.status === 'hidden' ? (
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-green-500" onClick={() => toggleStatus(review, 'published')}>
                              <Eye className="w-3 h-3 ml-1" />
                              نشر
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-orange-500" onClick={() => toggleStatus(review, 'hidden')}>
                              <Ban className="w-3 h-3 ml-1" />
                              إخفاء
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-red-500" onClick={() => deleteReview(review.id)}>
                            <Trash2 className="w-3 h-3 ml-1" />
                            حذف
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Reply Dialog */}
      <Dialog open={replyDialog} onOpenChange={setReplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الرد على التقييم</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{selectedReview.userName}</span>
                  <div className="flex">{renderStars(selectedReview.rating)}</div>
                </div>
                <p className="text-sm">{selectedReview.comment}</p>
              </div>
              <div>
                <Label>الرد</Label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(false)}>إلغاء</Button>
            <Button onClick={handleReply} disabled={replying} className="bg-[#5C1A1B] hover:bg-[#3D0F10]">
              {replying ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Reply className="w-4 h-4 ml-2" />}
              إرسال الرد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
