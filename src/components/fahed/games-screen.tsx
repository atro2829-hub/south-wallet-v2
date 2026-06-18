'use client';

'use client';

import { useState, useEffect, useCallback, Component, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Search, Gamepad2, Loader2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Globe, ShoppingCart, Star, Users, Zap, Trophy, Flame } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { supabase, supabaseService } from '@/lib/supabase';
import {
  getApiProviders,
  getApiProvider,
  getCachedProviderData,
  checkPlayerId,
  getGameCatalogue,
  getGameFields,
  getGameServers,
  placeGameOrder,
  checkGameOrderStatus,
  type ApiGame,
  type ApiGameCatalogue,
  type ApiGameFields,
  type ApiGameServer,
  type ApiProvider,
  type GameOrderResult,
  type OrderStatus,
} from '@/lib/api-providers';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ===== Error Boundary =====
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GamesErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('GamesScreen Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || 'يرجى المحاولة مرة أخرى'}
            </p>
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              variant="outline"
            >
              إعادة المحاولة
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ===== Order Result Type =====
interface OrderResult {
  success: boolean;
  message: string;
  deliveryItems?: string[] | null;
}

// ===== Main Games Screen =====
export function GamesScreen() {
  return (
    <GamesErrorBoundary>
      <GamesScreenInner />
    </GamesErrorBoundary>
  );
}

function GamesScreenInner() {
  const { user, categories, setActiveScreen } = useAppStore();
  const [games, setGames] = useState<ApiGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<ApiGame | null>(null);
  const [catalogue, setCatalogue] = useState<ApiGameCatalogue[]>([]);
  const [gameFields, setGameFields] = useState<ApiGameFields | null>(null);
  const [gameServers, setGameServers] = useState<ApiGameServer>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string>('');
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  // Load games from active API provider (Supabase)
  useEffect(() => {
    let cancelled = false;

    const loadGames = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        // Find the category with api-games screenType
        // Categories from the store are ServiceCategory[] but may have dynamic fields
        // from Supabase sections table attached as extra properties
        const gamesCategory = (categories || []).find((c: any) =>
          c.screenType === 'api-games' || c.type === 'games'
        );
        const pId = gamesCategory?.apiProviderId || '';

        if (!pId) {
          // Try to find any enabled provider that supports games from Supabase
          try {
            const providers = await getApiProviders();
            if (cancelled) return;
            const gamesProvider = providers.find((p: ApiProvider) => p.enabled && p.supportsGames);
            if (gamesProvider) {
              setProviderId(gamesProvider.id);
              const cache = await getCachedProviderData(gamesProvider.id);
              if (cancelled) return;
              setGames(cache.games || []);
            } else {
              // No games provider found — show empty state, not error
              setGames([]);
            }
          } catch (error) {
            console.error('Error loading games from Supabase:', error);
            if (!cancelled) {
              setLoadError('فشل تحميل مزود الألعاب');
              setGames([]);
            }
          }
        } else {
          setProviderId(pId);
          try {
            const cache = await getCachedProviderData(pId);
            if (cancelled) return;
            setGames(cache.games || []);
          } catch (error) {
            console.error('Error loading cached provider data:', error);
            if (!cancelled) {
              setLoadError('فشل تحميل بيانات الألعاب');
              setGames([]);
            }
          }
        }
      } catch (error: any) {
        console.error('Error in loadGames:', error);
        if (!cancelled) {
          setLoadError(error.message || 'حدث خطأ أثناء تحميل الألعاب');
          setGames([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadGames();

    return () => {
      cancelled = true;
    };
  }, [categories]);

  const filteredGames = (games || []).filter(g =>
    g.enabled !== false &&
    (searchQuery ? (g.name || '').toLowerCase().includes(searchQuery.toLowerCase()) : true)
  );

  const handleSelectGame = async (game: ApiGame) => {
    setSelectedGame(game);
    setCatalogue([]);
    setGameFields(null);
    setGameServers({});

    if (!providerId) return;

    try {
      const provider = await getApiProvider(providerId);
      if (!provider) return;

      const [cat, fields, servers] = await Promise.all([
        getGameCatalogue(provider, game.code).catch(() => []),
        getGameFields(provider, game.code).catch(() => ({ fields: [], notes: '' })),
        getGameServers(provider, game.code).catch(() => ({})),
      ]);

      setCatalogue(cat || []);
      setGameFields(fields);
      setGameServers(servers || {});
    } catch (error: any) {
      toast.error(`فشل تحميل بيانات اللعبة: ${error.message}`);
    }
  };

  const handleBack = () => {
    if (selectedGame) {
      setSelectedGame(null);
      setCatalogue([]);
      setGameFields(null);
      setGameServers({});
    } else {
      setActiveScreen('main');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">جاري تحميل الألعاب...</p>
        </div>
      </div>
    );
  }

  if (loadError && games.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-navy-gradient px-4 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 glass rounded-xl">
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-white text-lg font-bold">الألعاب</h1>
          </div>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-muted-foreground">{loadError}</p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-navy-gradient px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 glass rounded-xl">
            <ArrowRight className="h-5 w-5 text-white" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">
              {selectedGame ? selectedGame.name : 'الألعاب'}
            </h1>
            {selectedGame && (
              <p className="text-white/50 text-xs">{catalogue.length} باقة متاحة</p>
            )}
          </div>
        </div>

        {/* Search */}
        {!selectedGame && (
          <div className="relative mt-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن لعبة..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 pr-10 text-white placeholder:text-white/40 text-sm"
            />
          </div>
        )}
      </div>

      <div className="px-4 mt-4">
        {selectedGame ? (
          <GamePurchaseView
            game={selectedGame}
            catalogue={catalogue}
            gameFields={gameFields}
            gameServers={gameServers}
            providerId={providerId}
            user={user}
            onBack={() => { setSelectedGame(null); setCatalogue([]); setGameFields(null); setGameServers({}); }}
            onOrderResult={setOrderResult}
          />
        ) : (
          <GamesGrid games={filteredGames} onSelect={handleSelectGame} loadError={loadError} />
        )}
      </div>

      {/* Order Result Modal */}
      <AnimatePresence>
        {orderResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setOrderResult(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="glass-card rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                {orderResult.success ? (
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
                ) : (
                  <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-3" />
                )}
                <h3 className="text-lg font-bold mb-2">{orderResult.success ? 'تم بنجاح' : 'فشل العملية'}</h3>
                <p className="text-sm text-muted-foreground mb-4">{orderResult.message}</p>
                {orderResult.deliveryItems && orderResult.deliveryItems.length > 0 && (
                  <div className="bg-green-500/10 rounded-xl p-3 mb-4 border border-green-500/30">
                    <p className="text-xs text-muted-foreground mb-1">الكود:</p>
                    <p className="text-lg font-mono font-bold text-green-500">{orderResult.deliveryItems[0]}</p>
                  </div>
                )}
                <Button onClick={() => setOrderResult(null)} className="w-full">حسناً</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== Game Purchase View =====
function GamePurchaseView({
  game,
  catalogue,
  gameFields,
  gameServers,
  providerId,
  user,
  onBack,
  onOrderResult,
}: {
  game: ApiGame;
  catalogue: ApiGameCatalogue[];
  gameFields: ApiGameFields | null;
  gameServers: ApiGameServer;
  providerId: string;
  user: any;
  onBack: () => void;
  onOrderResult: (result: OrderResult | null) => void;
}) {
  const [playerId, setPlayerId] = useState('');
  const [serverId, setServerId] = useState('');
  const [selectedCatalogue, setSelectedCatalogue] = useState<ApiGameCatalogue | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [playerValid, setPlayerValid] = useState<{ valid: boolean; name?: string } | null>(null);

  const fields = gameFields?.fields || [];
  const hasUserIdField = fields.includes('userid');
  const hasServerIdField = fields.includes('serverid');
  const serverEntries = Object.entries(gameServers || {});

  const handleValidatePlayer = async () => {
    if (!playerId || !providerId) return;
    setValidating(true);
    try {
      const provider = await getApiProvider(providerId);
      if (!provider) {
        toast.error('المزود غير متاح');
        return;
      }
      const result = await checkPlayerId(provider, game.code, playerId, serverId || undefined);
      setPlayerValid(result);
      if (result.valid) {
        toast.success(`اللاعب: ${result.name}`);
      } else {
        toast.error('معرف اللاعب غير صالح');
      }
    } catch (error: any) {
      toast.error(`فشل التحقق: ${error.message}`);
      setPlayerValid(null);
    } finally {
      setValidating(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || !selectedCatalogue || !playerId || !providerId) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (hasUserIdField && playerValid && !playerValid.valid) {
      toast.error('يرجى التحقق من معرف اللاعب أولاً');
      return;
    }

    setPurchasing(true);
    try {
      const provider = await getApiProvider(providerId);
      if (!provider) throw new Error('المزود غير متاح');

      const markup = provider.markupPercent || 0;
      const finalPrice = selectedCatalogue.amount * (1 + markup / 100);

      // Check balance (USD only)
      const userBalance = user.balanceUSD || 0;
      if (userBalance < finalPrice) {
        toast.error('رصيدك غير كافي');
        setPurchasing(false);
        return;
      }

      const result: GameOrderResult = await placeGameOrder(
        provider,
        game.code,
        selectedCatalogue.name,
        playerId,
        serverId || undefined
      );

      if (result.success) {
        // Deduct balance via Supabase
        try {
          await supabaseService.updateBalance(user.userId || user.id, 'USD', finalPrice, 'subtract');
        } catch (balanceError: any) {
          console.error('Error deducting balance:', balanceError);
        }

        // Create order in Supabase
        try {
          await supabaseService.createOrder({
            user_id: user.userId || user.id,
            provider_id: providerId,
            provider_name: provider.name,
            package_id: '',
            package_name: selectedCatalogue.name,
            category_id: '',
            category_name: game.name,
            customer_input: playerId,
            amount: finalPrice,
            currency: 'USD',
            cost_price: selectedCatalogue.amount,
            cost_currency: 'USD',
            commission_amount: finalPrice - selectedCatalogue.amount,
            commission_type: 'percentage',
            execution_type: 'api',
            status: result.order.status === 'PENDING' ? 'pending' : 'processing',
            api_provider_id: providerId,
            api_product_id: '',
            api_order_id: String(result.order.order_id),
            api_response: result,
            result_code: '',
            result_message: result.message || '',
            result_pin_code: '',
          });
        } catch (orderError: any) {
          console.error('Error creating order record:', orderError);
        }

        // Set order result for modal display
        onOrderResult({
          success: true,
          message: result.message || 'تم إنشاء الطلب بنجاح',
          deliveryItems: null,
        });

        // If pending, start polling for status updates
        if (result.order.status === 'PENDING' && result.order.order_id) {
          pollOrderStatus(result.order.order_id, game.code, provider);
        }
      } else {
        // Order was not successful
        onOrderResult({
          success: false,
          message: result.message || 'فشل إنشاء الطلب',
        });
      }
    } catch (error: any) {
      // If the error already has a translated Arabic message from apiRequest
      // (providerError flag), surface it verbatim. Otherwise, wrap generically.
      const message = error?.providerError
        ? error.message
        : `فشل الشراء: ${error.message}`;
      onOrderResult({
        success: false,
        message,
      });
    } finally {
      setPurchasing(false);
    }
  };

  const pollOrderStatus = async (orderId: number, gameCode: string, provider: ApiProvider) => {
    let attempts = 0;
    const maxAttempts = 12;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) { clearInterval(interval); return; }
      try {
        const status: OrderStatus = await checkGameOrderStatus(provider, orderId, gameCode);
        if (status.status === 'COMPLETED') {
          clearInterval(interval);
          onOrderResult({
            success: true,
            message: 'تم تسليم الطلب بنجاح!',
            deliveryItems: status.delivery_items || null,
          });
        } else if (status.status === 'FAILED') {
          clearInterval(interval);
          onOrderResult({
            success: false,
            message: 'فشل الطلب وتم استرداد المبلغ',
          });
        }
      } catch {
        // Silently continue polling on network errors
      }
    }, 10000);
  };

  return (
    <div className="space-y-4">
      {/* Game Info */}
      <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
        {game.image_url ? (
          <img
            src={game.image_url.startsWith('http') ? game.image_url : `https://api.g2bulk.com${game.image_url}`}
            alt={game.name || 'Game'}
            className="w-16 h-16 rounded-xl object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Gamepad2 className="h-8 w-8 text-red-500" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold">{game.name || 'لعبة'}</h2>
          {gameFields?.notes && (
            <p className="text-xs text-muted-foreground mt-1">{gameFields.notes}</p>
          )}
        </div>
      </div>

      {/* Player ID Input */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold">بيانات اللاعب</h3>
        {hasUserIdField && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">معرف اللاعب (Player ID)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={playerId}
                onChange={(e) => { setPlayerId(e.target.value); setPlayerValid(null); }}
                placeholder="أدخل معرف اللاعب"
                className="flex-1 px-3 py-2.5 bg-muted rounded-xl text-sm border-none focus:ring-2 focus:ring-primary/30"
                dir="ltr"
              />
              <button
                onClick={handleValidatePlayer}
                disabled={validating || !playerId}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تحقق'}
              </button>
            </div>
            {playerValid && (
              <p className={`text-xs mt-1 ${playerValid.valid ? 'text-green-500' : 'text-red-500'}`}>
                {playerValid.valid ? `✓ ${playerValid.name}` : '✗ معرف غير صالح'}
              </p>
            )}
          </div>
        )}
        {/* Always show player ID input even if fields is empty, as a fallback */}
        {!hasUserIdField && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">معرف اللاعب (Player ID)</label>
            <input
              type="text"
              value={playerId}
              onChange={(e) => { setPlayerId(e.target.value); setPlayerValid(null); }}
              placeholder="أدخل معرف اللاعب"
              className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-none focus:ring-2 focus:ring-primary/30"
              dir="ltr"
            />
          </div>
        )}
        {hasServerIdField && serverEntries.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">السيرفر</label>
            <select
              value={serverId}
              onChange={(e) => setServerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-none"
            >
              <option value="">اختر السيرفر</option>
              {serverEntries.map(([name, id]) => (
                <option key={name} value={id || name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Catalogue Selection - USD prices */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-bold">اختر الباقة</h3>
        <div className="space-y-2">
          {(catalogue || []).map((cat) => {
            const isSelected = selectedCatalogue?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatalogue(cat)}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-primary/10 border border-primary/30'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <span className="text-sm font-medium">{cat.name || 'باقة'}</span>
                <span className="text-sm font-bold text-primary">${(cat.amount || 0).toFixed(2)}</span>
              </button>
            );
          })}
          {(!catalogue || catalogue.length === 0) && (
            <p className="text-center text-muted-foreground text-sm py-4">لا توجد باقات متاحة</p>
          )}
        </div>
      </div>

      {/* Purchase Button */}
      {selectedCatalogue && (
        <button
          onClick={handlePurchase}
          disabled={purchasing || !playerId}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {purchasing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> جاري الشراء...</>
          ) : (
            <><ShoppingCart className="h-4 w-4" /> شراء ${(selectedCatalogue.amount || 0).toFixed(2)}</>
          )}
        </button>
      )}
    </div>
  );
}

// ===== GamesGrid Component (G2Bulk-style) =====

interface GamesGridProps {
  games: any[];
  onSelect: (game: any) => void;
  loadError?: string | null;
}

function GamesGrid({ games, onSelect, loadError }: GamesGridProps) {
  const [filter, setFilter] = useState<'all' | 'featured'>('all');

  const displayed = useMemo(() => {
    if (filter === 'featured') return games.filter(g => g.is_featured || g.isFeatured);
    return games;
  }, [games, filter]);

  if (games.length === 0) {
    return (
      <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Gamepad2 className="h-10 w-10 text-primary" />
        </div>
        <p className="text-muted-foreground font-medium">لا توجد ألعاب متاحة</p>
        {loadError ? (
          <p className="text-xs text-destructive max-w-xs text-center">{loadError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">يرجى التأكد من تفعيل مزود الألعاب</p>
        )}
      </div>
    );
  }

  const featuredGames = games.filter(g => g.is_featured || g.isFeatured);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['all', 'featured'] as const).filter(t => t !== 'featured' || featuredGames.length > 0).map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === t ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'}`}
          >
            {t === 'all' && <><Gamepad2 className="h-3 w-3" /> الكل ({games.length})</>}
            {t === 'featured' && <><Flame className="h-3 w-3" /> مميزة ({featuredGames.length})</>}
          </button>
        ))}
      </div>

      {filter === 'all' && featuredGames.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-xs font-medium text-muted-foreground">الأكثر شعبية</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {featuredGames.map(game => (
              <button key={game.code || game.id} onClick={() => onSelect(game)}
                className="flex-none w-28 glass-card rounded-2xl p-2.5 card-press text-center border-2 border-yellow-500/30">
                <GameImage game={game} size="lg" />
                <p className="text-xs font-semibold mt-1.5 truncate">{game.name || 'لعبة'}</p>
                <div className="flex items-center justify-center gap-0.5 mt-0.5">
                  <Zap className="h-2.5 w-2.5 text-yellow-500" />
                  <span className="text-[9px] text-yellow-500">مميزة</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {displayed.map((game) => (
          <motion.button
            key={game.code || game.id}
            onClick={() => onSelect(game)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            className="glass-card rounded-2xl p-2.5 card-press text-center relative overflow-hidden"
          >
            {(game.is_featured || game.isFeatured) && (
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                <Star className="h-2.5 w-2.5 text-white fill-white" />
              </div>
            )}
            <GameImage game={game} size="md" />
            <p className="text-[11px] font-medium mt-1.5 leading-tight line-clamp-2">
              {game.name || 'لعبة'}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function GameImage({ game, size }: { game: any; size: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const sizes = { sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-16 h-16' };
  const iconSizes = { sm: 'h-5 w-5', md: 'h-7 w-7', lg: 'h-8 w-8' };

  const imageUrl = game.image_url
    ? (game.image_url.startsWith('http') ? game.image_url : `https://api.g2bulk.com${game.image_url}`)
    : null;

  return (
    <div className={`${sizes[size]} rounded-xl mx-auto overflow-hidden`}>
      {!failed && imageUrl ? (
        <img
          src={imageUrl}
          alt={game.name || 'Game'}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-primary/10 flex items-center justify-center rounded-xl">
          <Gamepad2 className={`${iconSizes[size]} text-primary`} />
        </div>
      )}
    </div>
  );
}
