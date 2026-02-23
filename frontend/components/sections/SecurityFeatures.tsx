import { Shield, Zap, Fingerprint, Scale } from 'lucide-react';

export default function SecurityFeatures() {
  const features = [
    {
      icon: Shield,
      title: 'Immutable Records',
      description: 'Every action is recorded on the blockchain.',
    },
    {
      icon: Zap,
      title: 'Instant Payments',
      description: 'Funds settle in seconds, not days.',
    },
    {
      icon: Fingerprint,
      title: 'Identity Protection',
      description: 'Zero-knowledge proof verification.',
    },
    {
      icon: Scale,
      title: 'Dispute Resolution',
      description: 'Automated arbitration protocols.',
    },
  ];

  return (
    <section className="py-20 bg-blue-800">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Security Built into Every Lease
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8 text-center hover:bg-white/20 transition-all "
            >
              <div className="w-16 h-16 .bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <feature.icon className="size-12 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-blue-100 leading-relaxed text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
